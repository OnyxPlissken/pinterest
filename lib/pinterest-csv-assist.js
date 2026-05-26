import crypto from "node:crypto";

import { buildAssetFingerprint, buildAssetLocationFingerprint } from "./asset-fingerprint";
import {
  createPinterestBoard,
  createPinterestBoardSection,
  deletePinterestPin,
  listPinterestBoardPins,
  listPinterestBoardSections,
  listPinterestBoards
} from "./pinterest-api";
import { applyPinterestRowEdits, loadPinterestSelection } from "./pinterest";
import { loadPinterestSyncStore, savePinterestSyncStore } from "./pinterest-sync-store";
import { buildPublicMediaUrl } from "./media-url";
import { getSharePointFileContentHash } from "./sharepoint-content-hash";

const CSV_HEADERS = [
  "Title",
  "Media URL",
  "Pinterest board",
  "Thumbnail",
  "Description",
  "Link",
  "Publish date",
  "Keywords"
];

const STRATEGIES = new Set(["newOnly", "replaceChanged", "regenerateSelection", "reportOnly"]);

function hashJson(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function escapeCsvValue(value) {
  const stringValue = String(value ?? "");
  if (!/[",\n]/.test(stringValue)) {
    return stringValue;
  }

  return `"${stringValue.replaceAll('"', '""')}"`;
}

function serializeCsv(rows) {
  return [CSV_HEADERS.join(","), ...rows.map((row) => CSV_HEADERS.map((header) => escapeCsvValue(row[header] ?? "")).join(","))].join("\n");
}

function normalizeKeyPart(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function splitBoardPath(value) {
  const [boardName = "", sectionName = ""] = String(value || "").split("/");

  return {
    boardName: boardName.trim(),
    sectionName: sectionName.trim()
  };
}

function getSourceKey(item) {
  return item.file.uniqueId || item.file.serverRelativeUrl;
}

function buildPinMatchKey({ boardName, sectionName, title }) {
  return [boardName, sectionName, title].map(normalizeKeyPart).join("||");
}

function buildTarget(item, row) {
  const { boardName, sectionName } = splitBoardPath(row["Pinterest board"]);
  const metadata = {
    title: row.Title,
    description: row.Description,
    link: row.Link || "",
    boardName,
    sectionName
  };

  return {
    sourceKey: getSourceKey(item),
    sourceSubPath: item.sourceSubPath,
    serverRelativeUrl: item.file.serverRelativeUrl,
    filename: item.file.name,
    imageSignature: buildAssetFingerprint(item.file),
    locationSignature: buildAssetLocationFingerprint(item.file),
    metadataSignature: hashJson(metadata),
    metadata,
    mediaUrl: row["Media URL"],
    row,
    matchKey: buildPinMatchKey(metadata),
    contentHash: ""
  };
}

function buildStoredPendingPin(target, batchId, matchedPin = null) {
  return {
    sourceKey: target.sourceKey,
    sourceSubPath: target.sourceSubPath,
    serverRelativeUrl: target.serverRelativeUrl,
    filename: target.filename,
    pinId: matchedPin?.pinId || "",
    pinUrl: matchedPin?.pinUrl || "",
    boardId: matchedPin?.boardId || "",
    boardName: target.metadata.boardName,
    boardSectionId: matchedPin?.boardSectionId || "",
    sectionName: target.metadata.sectionName,
    imageSignature: target.imageSignature,
    locationSignature: target.locationSignature,
    contentHash: target.contentHash || matchedPin?.contentHash || "",
    metadataSignature: target.metadataSignature,
    title: target.metadata.title,
    description: target.metadata.description,
    link: target.metadata.link,
    mediaUrl: target.mediaUrl,
    csvBatchId: batchId,
    status: matchedPin?.pinId ? "matched_pinterest" : "pending_csv_upload",
    syncedAt: new Date().toISOString()
  };
}

function buildDuplicateTargetMessage(duplicates) {
  const examples = duplicates
    .slice(0, 5)
    .map((duplicate) => `"${duplicate.title}" in "${duplicate.boardName}${duplicate.sectionName ? `/${duplicate.sectionName}` : ""}"`)
    .join(", ");

  return `Selezione bloccata: ${duplicates.length} destinazioni Pinterest duplicate nella stessa selezione. Controlla titoli, bacheche e sezioni. Esempi: ${examples}.`;
}

function validateUniqueTargets(targets) {
  const seen = new Map();
  const duplicates = [];

  for (const target of targets) {
    const current = seen.get(target.matchKey);
    if (current) {
      duplicates.push({
        title: target.metadata.title,
        boardName: target.metadata.boardName,
        sectionName: target.metadata.sectionName,
        files: [current.filename, target.filename]
      });
      continue;
    }

    seen.set(target.matchKey, target);
  }

  if (duplicates.length) {
    throw new Error(buildDuplicateTargetMessage(duplicates));
  }
}

function findStoredMatch(store, target) {
  const existing = store.pins[target.sourceKey];
  if (existing) {
    return {
      ...existing,
      source: "store"
    };
  }

  return Object.values(store.pins).find((pin) => {
    const matchKey = buildPinMatchKey({
      boardName: pin.boardName,
      sectionName: pin.sectionName,
      title: pin.title
    });

    return matchKey === target.matchKey;
  }) || null;
}

function mergeExistingMatch(stored, pinterestMatch) {
  if (!stored) {
    return pinterestMatch;
  }

  if (!pinterestMatch) {
    return stored;
  }

  return {
    ...stored,
    pinId: stored.pinId || pinterestMatch.pinId || "",
    pinUrl: stored.pinUrl || pinterestMatch.pinUrl || "",
    boardId: stored.boardId || pinterestMatch.boardId || "",
    boardSectionId: stored.boardSectionId || pinterestMatch.boardSectionId || "",
    sectionName: stored.sectionName || pinterestMatch.sectionName || "",
    source: `${stored.source || "store"}+pinterest`
  };
}

async function loadPinterestPinIndex(config) {
  const index = new Map();
  const duplicates = [];
  const boardsByName = new Map();
  const sectionsByBoardName = new Map();
  const boards = await listPinterestBoards(config);

  for (const board of boards) {
    boardsByName.set(normalizeKeyPart(board.name), board);
    const sections = await listPinterestBoardSections(config, board.id);
    sectionsByBoardName.set(
      normalizeKeyPart(board.name),
      new Map(sections.map((section) => [normalizeKeyPart(section.name), section]))
    );
    const sectionsById = new Map(sections.map((section) => [section.id, section]));
    const pins = await listPinterestBoardPins(config, board.id);

    for (const pin of pins) {
      const section = sectionsById.get(pin.board_section_id || "");
      const title = pin.title || "";
      const key = buildPinMatchKey({
        boardName: board.name,
        sectionName: section?.name || "",
        title
      });

      const entry = {
        pinId: pin.id,
        pinUrl: pin.url || "",
        boardId: board.id,
        boardName: board.name,
        boardSectionId: section?.id || "",
        sectionName: section?.name || "",
        title,
        description: pin.description || "",
        link: pin.link || ""
      };
      const current = index.get(key);

      if (current) {
        duplicates.push({
          key,
          title,
          boardName: board.name,
          sectionName: section?.name || "",
          pinIds: [current.pinId, pin.id].filter(Boolean)
        });
        continue;
      }

      index.set(key, entry);
    }
  }

  return {
    pins: index,
    duplicates,
    boardsByName,
    sectionsByBoardName
  };
}

function buildDuplicateAudit(duplicates, targetKeys) {
  return duplicates
    .filter((duplicate) => targetKeys.has(duplicate.key))
    .slice(0, 20)
    .map((duplicate) => ({
      title: duplicate.title,
      boardName: duplicate.boardName,
      sectionName: duplicate.sectionName,
      pinIds: duplicate.pinIds
    }));
}

function buildMissingContainers(targets, pinterestState) {
  const missingBoards = new Map();
  const missingSections = new Map();

  for (const target of targets) {
    const boardKey = normalizeKeyPart(target.metadata.boardName);
    const sectionKey = normalizeKeyPart(target.metadata.sectionName);
    const existingBoard = pinterestState.boardsByName.get(boardKey);

    if (!existingBoard) {
      missingBoards.set(boardKey, {
        name: target.metadata.boardName
      });
      if (sectionKey) {
        missingSections.set(`${boardKey}||${sectionKey}`, {
          boardName: target.metadata.boardName,
          sectionName: target.metadata.sectionName,
          boardMissing: true
        });
      }
      continue;
    }

    if (!sectionKey) {
      continue;
    }

    const sections = pinterestState.sectionsByBoardName.get(boardKey) || new Map();
    if (!sections.has(sectionKey)) {
      missingSections.set(`${boardKey}||${sectionKey}`, {
        boardId: existingBoard.id,
        boardName: target.metadata.boardName,
        sectionName: target.metadata.sectionName,
        boardMissing: false
      });
    }
  }

  return {
    missingBoards: Array.from(missingBoards.values()),
    missingSections: Array.from(missingSections.values())
  };
}

async function ensureMissingContainers(config, containers, { privacy = "SECRET" } = {}) {
  const createdBoards = [];
  const createdSections = [];
  const boardsByName = new Map();

  for (const board of await listPinterestBoards(config)) {
    boardsByName.set(normalizeKeyPart(board.name), board);
  }

  for (const missingBoard of containers.missingBoards) {
    const boardKey = normalizeKeyPart(missingBoard.name);
    let board = boardsByName.get(boardKey);
    if (!board) {
      board = await createPinterestBoard(config, missingBoard.name, { privacy });
      createdBoards.push({ id: board.id, name: board.name || missingBoard.name });
      boardsByName.set(boardKey, board);
    }
  }

  const sectionsCache = new Map();
  for (const missingSection of containers.missingSections) {
    const board = boardsByName.get(normalizeKeyPart(missingSection.boardName));
    if (!board) {
      continue;
    }

    const boardKey = normalizeKeyPart(board.name || missingSection.boardName);
    if (!sectionsCache.has(boardKey)) {
      const sections = await listPinterestBoardSections(config, board.id).catch(() => []);
      sectionsCache.set(
        boardKey,
        new Map(sections.map((section) => [normalizeKeyPart(section.name), section]))
      );
    }

    const sections = sectionsCache.get(boardKey);
    const sectionKey = normalizeKeyPart(missingSection.sectionName);
    if (!sections.has(sectionKey)) {
      const section = await createPinterestBoardSection(config, board.id, missingSection.sectionName);
      createdSections.push({
        id: section.id,
        name: section.name || missingSection.sectionName,
        boardId: board.id,
        boardName: board.name || missingSection.boardName
      });
      sections.set(sectionKey, section);
    }
  }

  return {
    createdBoards,
    createdSections
  };
}

async function hydrateTargetContentHash(config, target) {
  if (target.contentHash) {
    return target.contentHash;
  }

  target.contentHash = await getSharePointFileContentHash(config.sharePoint, {
    serverRelativeUrl: target.serverRelativeUrl,
    imageSignature: target.imageSignature
  });
  target.mediaUrl = buildPublicMediaUrl(target.serverRelativeUrl, getTargetMediaOrigin(target), target.contentHash);
  target.row["Media URL"] = target.mediaUrl;
  return target.contentHash;
}

function getTargetMediaOrigin(target) {
  try {
    return new URL(target.mediaUrl).origin;
  } catch {
    return "";
  }
}

async function hasImageContentChanged(config, target, existing) {
  if (!existing) {
    return false;
  }

  const targetContentHash = await hydrateTargetContentHash(config, target);
  return Boolean(existing.contentHash && existing.contentHash !== targetContentHash);
}

async function classifyTarget(config, target, stored, pinterestMatch, strategy) {
  const existing = mergeExistingMatch(stored, pinterestMatch);

  if (!existing) {
    return {
      type: "create",
      target,
      pinId: "",
      reason: "Nessun Pin Pinterest trovato: genero una nuova riga CSV."
    };
  }

  if (!existing.pinId) {
    return {
      type: "create",
      target,
      pinId: "",
      matchedPin: null,
      reason: existing.status === "pending_csv_upload"
        ? "Gia esportato in CSV, ma senza Pin ID Pinterest: lo tratto come nuovo."
        : "Nessun Pin ID Pinterest identificato: lo tratto come nuovo."
    };
  }

  if (strategy === "regenerateSelection") {
    return {
      type: "replace",
      target,
      pinId: existing.pinId,
      matchedPin: existing,
      reason: "Rigenerazione richiesta per la selezione."
    };
  }

  const imageChanged = await hasImageContentChanged(config, target, existing);
  const metadataChanged = existing.metadataSignature && existing.metadataSignature !== target.metadataSignature;
  const locationChanged = existing.locationSignature
    ? existing.locationSignature !== target.locationSignature
    : (existing.serverRelativeUrl && existing.serverRelativeUrl !== target.serverRelativeUrl) ||
      (existing.filename && existing.filename !== target.filename);

  if (!imageChanged && !metadataChanged && locationChanged) {
    return {
      type: "relocated",
      target,
      pinId: existing.pinId || "",
      matchedPin: existing.pinId ? existing : null,
      reason: "File rinominato o spostato su SharePoint: aggiorno solo il registro, senza ricreare il Pin."
    };
  }

  if (imageChanged || metadataChanged || locationChanged) {
    const type =
      strategy === "replaceChanged"
        ? existing.pinId
          ? "replace"
          : "create"
        : "changed";
    const missingPinReason =
      strategy === "replaceChanged"
        ? "Vecchio Pin non identificato: genero la riga CSV senza delete."
        : "Vecchio Pin non identificato per la delete.";

    return {
      type,
      target,
      pinId: existing.pinId || "",
      matchedPin: existing.pinId ? existing : null,
      reason: imageChanged
        ? existing.pinId
          ? "Immagine modificata."
          : `Immagine modificata. ${missingPinReason}`
        : metadataChanged
          ? existing.pinId
            ? "Titolo, descrizione, link o destinazione modificati."
            : `Metadati modificati. ${missingPinReason}`
          : existing.pinId
            ? "File rinominato o spostato con metadati non allineati."
            : `File rinominato o spostato con metadati non allineati. ${missingPinReason}`
    };
  }

  return {
    type: "unchanged",
    target,
    pinId: existing.pinId || "",
    matchedPin: existing.pinId ? existing : null,
    reason: existing.status === "pending_csv_upload" && !existing.pinId ? "Gia esportato in CSV e in attesa upload." : "Gia tracciato e invariato."
  };
}

function summarizeActions(actions) {
  return actions.reduce(
    (summary, action) => ({
      ...summary,
      [action.type]: (summary[action.type] || 0) + 1,
      deletable: summary.deletable + (["replace", "delete"].includes(action.type) && action.pinId ? 1 : 0),
      needsCsv: summary.needsCsv + (["create", "replace"].includes(action.type) ? 1 : 0)
    }),
    {
      create: 0,
      replace: 0,
      changed: 0,
      unchanged: 0,
      delete: 0,
      relocated: 0,
      failed: 0,
      deletable: 0,
      needsCsv: 0
    }
  );
}

async function buildCsvAssistPlan({
  subPaths = [],
  subPath = "",
  origin = "",
  ruleId = "",
  strategy = "newOnly",
  forceRefresh = false,
  rowEdits = []
} = {}) {
  const selectedStrategy = STRATEGIES.has(strategy) ? strategy : "newOnly";
  const selection = applyPinterestRowEdits(
    await loadPinterestSelection({
      subPaths,
      subPath,
      origin,
      ruleId,
      forceRefresh
    }),
    rowEdits
  );
  const syncStore = await loadPinterestSyncStore();
  const store = syncStore.store;
  const pinterestState = await loadPinterestPinIndex(selection.config);
  const targets = selection.selectedItems.map((item, index) => buildTarget(item, selection.csvRows[index]));
  validateUniqueTargets(targets);
  const containers = buildMissingContainers(targets, pinterestState);
  const targetKeys = new Set(targets.map((target) => target.sourceKey));
  const targetMatchKeys = new Set(targets.map((target) => target.matchKey));
  const selectedSubPathSet = new Set(selection.selectedSubPaths);
  const actions = [];

  for (const target of targets) {
    const stored = findStoredMatch(store, target);
    const pinterestMatch = pinterestState.pins.get(target.matchKey) || null;
    try {
      actions.push(await classifyTarget(selection.config, target, stored, pinterestMatch, selectedStrategy));
    } catch (error) {
      actions.push({
        type: "failed",
        target,
        pinId: stored?.pinId || pinterestMatch?.pinId || "",
        matchedPin: stored || pinterestMatch,
        reason: error instanceof Error ? error.message : "Controllo contenuto immagine non riuscito."
      });
    }
  }

  for (const [sourceKey, existing] of Object.entries(store.pins)) {
    if (!selectedSubPathSet.has(existing.sourceSubPath) || targetKeys.has(sourceKey)) {
      continue;
    }

    actions.push({
      type: selectedStrategy === "regenerateSelection" ? "delete" : "changed",
      target: null,
      sourceKey,
      pinId: existing.pinId || "",
      filename: existing.filename,
      reason: "Presente nel registro ma non piu nella selezione SharePoint."
    });
  }

  return {
    selection,
    syncStore,
    strategy: selectedStrategy,
    containers,
    actions,
    summary: summarizeActions(actions),
    audit: {
      duplicatePinterestPins: buildDuplicateAudit(pinterestState.duplicates, targetMatchKeys)
    }
  };
}

function mapActionForClient(action) {
  return {
    type: action.type,
    filename: action.target?.filename || action.filename || "",
    title: action.target?.metadata?.title || "",
    boardName: action.target?.metadata?.boardName || "",
    sectionName: action.target?.metadata?.sectionName || "",
    pinId: action.pinId || "",
    reason: action.reason || ""
  };
}

export async function previewCsvAssist(options = {}) {
  const plan = await buildCsvAssistPlan(options);

  return {
    strategy: plan.strategy,
    sourcePaths: plan.selection.sourcePaths,
    selectedSubPaths: plan.selection.selectedSubPaths,
    scannedCount: plan.selection.files.length,
    generatedCount: plan.selection.csvRows.length,
    skippedCount: plan.selection.skipped.length,
    summary: plan.summary,
    audit: plan.audit,
    containers: plan.containers,
    actions: plan.actions.map(mapActionForClient).slice(0, 200),
    storage: {
      persistent: plan.syncStore.persistent,
      issue: plan.syncStore.issue,
      label: plan.syncStore.storageLabel
    }
  };
}

async function deletePinIfPresent(config, pinId) {
  if (!pinId) {
    return false;
  }

  try {
    await deletePinterestPin(config, pinId);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "");
    if (message.includes("Pinterest API 404")) {
      return false;
    }

    throw error;
  }
}

export async function generateCsvAssist(options = {}) {
  const plan = await buildCsvAssistPlan(options);
  const batchId = crypto.randomUUID();
  const rows = [];
  const nextPins = {
    ...plan.syncStore.store.pins
  };
  const results = [];

  if (plan.strategy === "reportOnly") {
    return {
      ...await previewCsvAssist(options),
      csvContent: "",
      csvFilename: "",
      csvBatchId: batchId,
      deletedCount: 0
    };
  }

  const containersCreated = options.createMissingContainers
    ? await ensureMissingContainers(plan.selection.config, plan.containers, {
        privacy: "SECRET"
      })
    : { createdBoards: [], createdSections: [] };

  for (const action of plan.actions) {
    try {
      if (action.type === "delete") {
        const deleted = await deletePinIfPresent(plan.selection.config, action.pinId);
        delete nextPins[action.sourceKey || ""];
        results.push({ ...mapActionForClient(action), deleted });
        continue;
      }

      if (!["create", "replace"].includes(action.type) || !action.target) {
        if (action.type !== "failed" && action.target && action.pinId) {
          nextPins[action.target.sourceKey] = buildStoredPendingPin(
            action.target,
            batchId,
            action.matchedPin || action
          );
        }
        results.push(mapActionForClient(action));
        continue;
      }

      let deleted = false;
      if (action.type === "replace" && action.pinId) {
        deleted = await deletePinIfPresent(plan.selection.config, action.pinId);
      }

      await hydrateTargetContentHash(plan.selection.config, action.target);
      rows.push(action.target.row);
      nextPins[action.target.sourceKey] = buildStoredPendingPin(action.target, batchId);
      results.push({ ...mapActionForClient(action), deleted });
    } catch (error) {
      results.push({
        ...mapActionForClient(action),
        type: "failed",
        error: error instanceof Error ? error.message : "Errore CSV assist."
      });
    }
  }

  await savePinterestSyncStore(
    {
      version: 1,
      pins: nextPins,
      runs: [
        {
          id: batchId,
          dryRun: false,
          mode: "csv-assist",
          strategy: plan.strategy,
          createdAt: new Date().toISOString(),
          selectedSubPaths: plan.selection.selectedSubPaths,
          scannedCount: plan.selection.files.length,
          selectedCount: rows.length,
          summary: summarizeActions(results),
          containersCreated
        },
        ...plan.syncStore.store.runs
      ].slice(0, 25)
    },
    plan.syncStore.persistent,
    plan.syncStore.issue
  );

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  return {
    strategy: plan.strategy,
    sourcePaths: plan.selection.sourcePaths,
    selectedSubPaths: plan.selection.selectedSubPaths,
    scannedCount: plan.selection.files.length,
    generatedCount: rows.length,
    skippedCount: plan.selection.skipped.length,
    summary: summarizeActions(results),
    audit: plan.audit,
    containers: plan.containers,
    containersCreated,
    actions: results.slice(0, 200),
    csvContent: rows.length ? serializeCsv(rows) : "",
    csvFilename: rows.length ? `pinterest-csv-assist-${timestamp}.csv` : "",
    csvBatchId: batchId,
    previewMediaUrl: rows[0]?.["Media URL"] ?? "",
    deletedCount: results.filter((result) => result.deleted).length,
    storage: {
      persistent: plan.syncStore.persistent,
      issue: plan.syncStore.issue,
      label: plan.syncStore.storageLabel
    }
  };
}
