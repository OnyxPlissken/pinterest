import crypto from "node:crypto";

import { buildAssetFingerprint } from "./asset-fingerprint";
import {
  createPinterestBoard,
  createPinterestBoardSection,
  deletePinterestPin,
  listPinterestBoardPins,
  listPinterestBoardSections,
  listPinterestBoards
} from "./pinterest-api";
import { loadPinterestSelection } from "./pinterest";
import { loadPinterestSyncStore, savePinterestSyncStore } from "./pinterest-sync-store";

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
    metadataSignature: hashJson(metadata),
    metadata,
    mediaUrl: row["Media URL"],
    row,
    matchKey: buildPinMatchKey(metadata)
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
  const boardsByName = new Map();
  const sectionsByBoardName = new Map();
  const boards = await listPinterestBoards(config).catch(() => []);

  for (const board of boards) {
    boardsByName.set(normalizeKeyPart(board.name), board);
    const sections = await listPinterestBoardSections(config, board.id).catch(() => []);
    sectionsByBoardName.set(
      normalizeKeyPart(board.name),
      new Map(sections.map((section) => [normalizeKeyPart(section.name), section]))
    );
    const sectionsById = new Map(sections.map((section) => [section.id, section]));
    const pins = await listPinterestBoardPins(config, board.id).catch(() => []);

    for (const pin of pins) {
      const section = sectionsById.get(pin.board_section_id || "");
      const title = pin.title || "";
      const key = buildPinMatchKey({
        boardName: board.name,
        sectionName: section?.name || "",
        title
      });

      if (!index.has(key)) {
        index.set(key, {
          pinId: pin.id,
          pinUrl: pin.url || "",
          boardId: board.id,
          boardName: board.name,
          boardSectionId: section?.id || "",
          sectionName: section?.name || "",
          title,
          description: pin.description || "",
          link: pin.link || ""
        });
      }
    }
  }

  return {
    pins: index,
    boardsByName,
    sectionsByBoardName
  };
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

function classifyTarget(target, stored, pinterestMatch, strategy) {
  const existing = mergeExistingMatch(stored, pinterestMatch);

  if (!existing) {
    return {
      type: "create",
      target,
      pinId: "",
      reason: "Nuovo asset non ancora tracciato."
    };
  }

  if (strategy === "regenerateSelection") {
    return {
      type: existing.pinId ? "replace" : "changed",
      target,
      pinId: existing.pinId || "",
      matchedPin: existing.pinId ? existing : null,
      reason: existing.pinId
        ? "Rigenerazione richiesta per la selezione."
        : "Rigenerazione richiesta, ma il vecchio Pin non e identificato per la delete."
    };
  }

  const imageChanged = existing.imageSignature && existing.imageSignature !== target.imageSignature;
  const metadataChanged = existing.metadataSignature && existing.metadataSignature !== target.metadataSignature;
  const fileChanged = existing.serverRelativeUrl && existing.serverRelativeUrl !== target.serverRelativeUrl;

  if (imageChanged || metadataChanged || fileChanged) {
    return {
      type: strategy === "replaceChanged" && existing.pinId ? "replace" : "changed",
      target,
      pinId: existing.pinId || "",
      matchedPin: existing.pinId ? existing : null,
      reason: imageChanged
        ? existing.pinId
          ? "Immagine modificata."
          : "Immagine modificata, ma il vecchio Pin non e identificato per la delete."
        : metadataChanged
          ? existing.pinId
            ? "Titolo, descrizione, link o destinazione modificati."
            : "Metadati modificati, ma il vecchio Pin non e identificato per la delete."
          : existing.pinId
            ? "File rinominato o spostato."
            : "File rinominato o spostato, ma il vecchio Pin non e identificato per la delete."
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
  forceRefresh = false
} = {}) {
  const selectedStrategy = STRATEGIES.has(strategy) ? strategy : "newOnly";
  const selection = await loadPinterestSelection({
    subPaths,
    subPath,
    origin,
    ruleId,
    forceRefresh
  });
  const syncStore = await loadPinterestSyncStore();
  const store = syncStore.store;
  const pinterestState = await loadPinterestPinIndex(selection.config);
  const targets = selection.selectedItems.map((item, index) => buildTarget(item, selection.csvRows[index]));
  const containers = buildMissingContainers(targets, pinterestState);
  const targetKeys = new Set(targets.map((target) => target.sourceKey));
  const selectedSubPathSet = new Set(selection.selectedSubPaths);
  const actions = [];

  for (const target of targets) {
    const stored = findStoredMatch(store, target);
    const pinterestMatch = pinterestState.pins.get(target.matchKey) || null;
    actions.push(classifyTarget(target, stored, pinterestMatch, selectedStrategy));
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
    summary: summarizeActions(actions)
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
        if (action.target && action.pinId) {
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
