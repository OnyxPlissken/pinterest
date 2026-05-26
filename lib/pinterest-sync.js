import crypto from "node:crypto";

import {
  createPinterestBoard,
  createPinterestBoardSection,
  createPinterestPin,
  deletePinterestPin,
  listPinterestBoardPins,
  listPinterestBoardSections,
  listPinterestBoards
} from "./pinterest-api";
import { buildAssetFingerprint, buildAssetLocationFingerprint } from "./asset-fingerprint";
import { applyPinterestRowEdits, loadPinterestSelection } from "./pinterest";
import { buildPublicMediaUrl } from "./media-url";
import {
  loadPinterestSyncStore,
  savePinterestSyncStore
} from "./pinterest-sync-store";
import { getSharePointFileContentHash } from "./sharepoint-content-hash";

const NATURAL_SORTER = new Intl.Collator("it-IT", {
  numeric: true,
  sensitivity: "base"
});
const LOOK_NUMBER_PATTERN = /(?:^|[^a-z0-9])look[\s_#-]*(\d+)(?=[^a-z0-9]|$)/i;

function hashJson(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function splitBoardPath(value) {
  const [boardName = "", sectionName = ""] = String(value || "").split("/");

  if (!boardName.trim()) {
    throw new Error("Board Pinterest mancante nella riga generata.");
  }

  return {
    boardName: boardName.trim(),
    sectionName: sectionName.trim()
  };
}

function normalizePinterestName(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeKeyPart(value) {
  return normalizePinterestName(value);
}

function buildPinMatchKey({ boardName, sectionName, title }) {
  return [boardName, sectionName, title].map(normalizeKeyPart).join("||");
}

function buildNameMap(items = []) {
  return new Map(
    items
      .map((item) => [normalizePinterestName(item.name), item])
      .filter(([key]) => Boolean(key))
  );
}

function isDuplicateNameError(error) {
  const message = error instanceof Error ? error.message : String(error || "");
  const normalized = message.toLowerCase();

  return (
    normalized.includes("already have") ||
    normalized.includes("already exists") ||
    normalized.includes("try a different name")
  );
}

function normalizeSortCandidate(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }

  try {
    return decodeURIComponent(text).replace(/\+/g, " ");
  } catch {
    return text.replace(/\+/g, " ");
  }
}

function extractLookNumber(value) {
  const normalized = normalizeSortCandidate(value);
  const match = normalized.match(LOOK_NUMBER_PATTERN);
  return match ? Number.parseInt(match[1], 10) : null;
}

function resolveLookNumber(item, row) {
  const explicitLookNumber = item?.lookInfo?.lookNumber;
  if (Number.isInteger(explicitLookNumber)) {
    return explicitLookNumber;
  }

  const candidates = [
    row?.Title,
    row?.Description,
    row?.["Media URL"],
    item?.file?.name,
    item?.file?.serverRelativeUrl,
    item?.file?.relativePath
  ];

  for (const candidate of candidates) {
    const lookNumber = extractLookNumber(candidate);
    if (Number.isInteger(lookNumber)) {
      return lookNumber;
    }
  }

  return null;
}

function normalizePinId(value) {
  return String(value || "").trim();
}

function hasStoredPinterestPin(existing) {
  return Boolean(existing && normalizePinId(existing.pinId));
}

function normalizeBoardPrivacy(value) {
  const normalized = String(value || "").toUpperCase();
  return normalized === "SECRET" || normalized === "PROTECTED" ? "SECRET" : "PUBLIC";
}

function resolveTargetPrivacy(target, existing = null) {
  return normalizeBoardPrivacy(existing?.privacy || existing?.boardPrivacy || target?.privacy || "PUBLIC");
}

function preserveExistingPrivacy(target, existing = null) {
  return {
    ...target,
    privacy: resolveTargetPrivacy(target, existing)
  };
}

function compareSyncTargetsForUpload(left, right) {
  const leftLookNumber = left.lookNumber;
  const rightLookNumber = right.lookNumber;

  return (
    NATURAL_SORTER.compare(String(left.metadata.boardName || ""), String(right.metadata.boardName || "")) ||
    NATURAL_SORTER.compare(String(left.metadata.sectionName || ""), String(right.metadata.sectionName || "")) ||
    NATURAL_SORTER.compare(String(left.sourceSubPath || ""), String(right.sourceSubPath || "")) ||
    (leftLookNumber ?? Number.MAX_SAFE_INTEGER) -
      (rightLookNumber ?? Number.MAX_SAFE_INTEGER) ||
    NATURAL_SORTER.compare(String(left.filename || ""), String(right.filename || "")) ||
    NATURAL_SORTER.compare(String(left.sourceKey || ""), String(right.sourceKey || ""))
  );
}

function getSourceKey(item) {
  return item.file.uniqueId || item.file.serverRelativeUrl;
}

function buildPinTarget(item, row) {
  const { boardName, sectionName } = splitBoardPath(row["Pinterest board"]);
  const imageSignature = buildAssetFingerprint(item.file);
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
    imageSignature,
    locationSignature: buildAssetLocationFingerprint(item.file),
    metadataSignature: hashJson(metadata),
    metadata,
    lookNumber: resolveLookNumber(item, row),
    mediaUrl: row["Media URL"],
    matchKey: buildPinMatchKey(metadata),
    privacy: "PUBLIC",
    contentHash: ""
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
    boardPrivacy: stored.boardPrivacy || pinterestMatch.boardPrivacy || "",
    boardSectionId: stored.boardSectionId || pinterestMatch.boardSectionId || "",
    sectionName: stored.sectionName || pinterestMatch.sectionName || "",
    privacy: stored.privacy || pinterestMatch.privacy || stored.boardPrivacy || pinterestMatch.boardPrivacy || "",
    source: `${stored.source || "store"}+pinterest`
  };
}

async function ensureBoard(config, cache, boardName, privacy = "PUBLIC") {
  const boardKey = normalizePinterestName(boardName);
  const boardPrivacy = normalizeBoardPrivacy(privacy);

  async function refreshBoards() {
    const boards = await listPinterestBoards(config);
    cache.boards = buildNameMap(boards);
  }

  if (!cache.boards) {
    await refreshBoards();
  }

  let board = cache.boards.get(boardKey);
  if (!board) {
    try {
      board = await createPinterestBoard(config, boardName, { privacy: boardPrivacy });
    } catch (error) {
      if (!isDuplicateNameError(error)) {
        throw error;
      }

      await refreshBoards();
      board = cache.boards.get(boardKey);
      if (!board) {
        throw new Error(
          `Pinterest segnala che la bacheca "${boardName}" esiste gia, ma il token OAuth non la espone nella lista bacheche. Riconnetti OAuth con permessi boards:read_secret/boards:write_secret o rinomina la bacheca esistente.`
        );
      }
    }

    cache.boards.set(boardKey, board);
  }

  return board;
}

async function ensureSection(config, cache, board, sectionName) {
  if (!sectionName) {
    return null;
  }

  const boardId = board.id;
  if (!cache.sections.has(boardId)) {
    const sections = await listPinterestBoardSections(config, boardId);
    cache.sections.set(boardId, buildNameMap(sections));
  }

  const sections = cache.sections.get(boardId);
  const sectionKey = normalizePinterestName(sectionName);
  let section = sections.get(sectionKey);
  if (!section) {
    try {
      section = await createPinterestBoardSection(config, boardId, sectionName);
    } catch (error) {
      if (!isDuplicateNameError(error)) {
        throw error;
      }

      const refreshedSections = await listPinterestBoardSections(config, boardId);
      cache.sections.set(boardId, buildNameMap(refreshedSections));
      section = cache.sections.get(boardId).get(sectionKey);
      if (!section) {
        throw new Error(
          `Pinterest segnala che la sezione "${sectionName}" esiste gia nella bacheca "${board.name}", ma il token OAuth non la espone. Riconnetti OAuth con permessi board section completi o rinomina la sezione esistente.`
        );
      }
    }

    cache.sections.get(boardId).set(sectionKey, section);
  }

  return section;
}

async function loadPinterestPinIndexForTargets(config, targets) {
  const pins = new Map();
  const duplicates = [];
  const targetBoardKeys = new Set(
    targets.map((target) => normalizeKeyPart(target.metadata.boardName)).filter(Boolean)
  );
  const boards = await listPinterestBoards(config);
  const targetBoards = boards.filter((board) => targetBoardKeys.has(normalizeKeyPart(board.name)));

  for (const board of targetBoards) {
    const sections = await listPinterestBoardSections(config, board.id);
    const sectionsById = new Map(sections.map((section) => [section.id, section]));
    const boardPins = await listPinterestBoardPins(config, board.id);

    for (const pin of boardPins) {
      const section = sectionsById.get(pin.board_section_id || "");
      const title = pin.title || "";
      const key = buildPinMatchKey({
        boardName: board.name,
        sectionName: section?.name || "",
        title
      });
      const entry = {
        source: "pinterest",
        pinId: pin.id,
        pinUrl: pin.url || "",
        boardId: board.id,
        boardName: board.name,
        boardPrivacy: board.privacy || "",
        boardSectionId: section?.id || "",
        sectionName: section?.name || "",
        title,
        description: pin.description || "",
        link: pin.link || "",
        privacy: pin.privacy || board.privacy || ""
      };
      const current = pins.get(key);

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

      pins.set(key, entry);
    }
  }

  return {
    pins,
    duplicates,
    boards
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

async function createPinForTarget(config, cache, target) {
  const board = await ensureBoard(config, cache, target.metadata.boardName, target.privacy);
  const section = await ensureSection(config, cache, board, target.metadata.sectionName);
  const pin = await createPinterestPin(config, {
    boardId: board.id,
    boardSectionId: section?.id || "",
    title: target.metadata.title,
    description: target.metadata.description,
    link: target.metadata.link,
    mediaUrl: target.mediaUrl
  });

  return {
    pin,
    board,
    section
  };
}

async function deletePinIfPresent(config, pinId) {
  const normalizedPinId = normalizePinId(pinId);
  if (!normalizedPinId) {
    return;
  }

  try {
    await deletePinterestPin(config, normalizedPinId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "");
    if (!message.includes("Pinterest API 404")) {
      throw error;
    }
  }
}

function buildStoredPin(target, pin, board, section) {
  return {
    sourceKey: target.sourceKey,
    sourceSubPath: target.sourceSubPath,
    serverRelativeUrl: target.serverRelativeUrl,
    filename: target.filename,
    pinId: pin.id,
    pinUrl: pin.url || "",
    boardId: board.id,
    boardName: target.metadata.boardName,
    boardPrivacy: board.privacy || target.privacy || "",
    boardSectionId: section?.id || "",
    sectionName: target.metadata.sectionName,
    imageSignature: target.imageSignature,
    locationSignature: target.locationSignature,
    contentHash: target.contentHash || "",
    metadataSignature: target.metadataSignature,
    title: target.metadata.title,
    description: target.metadata.description,
    link: target.metadata.link,
    mediaUrl: target.mediaUrl,
    privacy: pin.privacy || board.privacy || target.privacy || "",
    status: "synced",
    syncedAt: new Date().toISOString()
  };
}

function buildStoredPinFromExisting(target, existing) {
  return {
    sourceKey: target.sourceKey,
    sourceSubPath: target.sourceSubPath,
    serverRelativeUrl: target.serverRelativeUrl,
    filename: target.filename,
    pinId: normalizePinId(existing.pinId),
    pinUrl: existing.pinUrl || "",
    boardId: existing.boardId || "",
    boardName: target.metadata.boardName,
    boardPrivacy: existing.boardPrivacy || existing.privacy || target.privacy || "",
    boardSectionId: existing.boardSectionId || "",
    sectionName: target.metadata.sectionName,
    imageSignature: target.imageSignature,
    locationSignature: target.locationSignature,
    contentHash: target.contentHash || existing.contentHash || "",
    metadataSignature: target.metadataSignature,
    title: target.metadata.title,
    description: target.metadata.description,
    link: target.metadata.link,
    mediaUrl: target.mediaUrl,
    privacy: existing.privacy || target.privacy || "",
    status: existing.source === "pinterest" ? "matched_pinterest" : "synced",
    syncedAt: new Date().toISOString()
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

function summarizeActions(actions) {
  return actions.reduce(
    (summary, action) => ({
      ...summary,
      [action.type]: (summary[action.type] || 0) + 1
    }),
    {
      created: 0,
      matched: 0,
      updated: 0,
      relocated: 0,
      verified: 0,
      replaced: 0,
      deleted: 0,
      unchanged: 0,
      failed: 0
    }
  );
}

function summarizeErrors(actions) {
  const byMessage = new Map();

  for (const action of actions) {
    if (action.type !== "failed" || !action.error) {
      continue;
    }

    const message = action.error;
    const current = byMessage.get(message) || {
      message,
      count: 0,
      files: []
    };

    current.count += 1;
    if (action.filename && current.files.length < 5) {
      current.files.push(action.filename);
    }

    byMessage.set(message, current);
  }

  return Array.from(byMessage.values()).sort((left, right) => right.count - left.count);
}

function emitProgress(onProgress, event) {
  if (typeof onProgress === "function") {
    onProgress(event);
  }
}

export async function syncPinterestPins({
  subPaths = [],
  subPath = "",
  origin = "",
  ruleId = "",
  dryRun = false,
  boardPrivacy = "PUBLIC",
  rowEdits = [],
  onProgress = null
} = {}) {
  emitProgress(onProgress, {
    scope: "sync",
    phase: "selection",
    current: 0,
    total: 0,
    message: "Preparo la selezione SharePoint."
  });
  const selection = applyPinterestRowEdits(
    await loadPinterestSelection({
      subPaths,
      subPath,
      origin,
      ruleId,
      onProgress: (event) => emitProgress(onProgress, { ...event, scope: "sync" })
    }),
    rowEdits
  );
  const syncStore = await loadPinterestSyncStore();
  const store = syncStore.store;
  const cache = {
    boards: null,
    sections: new Map()
  };
  const targets = selection.selectedItems
    .map((item, index) => ({
      ...buildPinTarget(item, selection.csvRows[index]),
      privacy: normalizeBoardPrivacy(boardPrivacy)
    }))
    .sort(compareSyncTargetsForUpload);
  validateUniqueTargets(targets);
  emitProgress(onProgress, {
    scope: "sync",
    phase: "targets",
    current: 0,
    total: targets.length,
    message: `${targets.length} Pin da controllare.`
  });
  const targetKeys = new Set(targets.map((target) => target.sourceKey));
  const targetMatchKeys = new Set(targets.map((target) => target.matchKey));
  const selectedSubPathSet = new Set(selection.selectedSubPaths);
  const actions = [];
  const nextPins = {
    ...store.pins
  };
  const claimedStoreKeys = new Set();
  emitProgress(onProgress, {
    scope: "sync",
    phase: "pinterest-index",
    current: 0,
    total: targets.length,
    message: "Leggo bacheche, sezioni e Pin esistenti da Pinterest."
  });
  const liveIndex = await loadPinterestPinIndexForTargets(selection.config, targets);
  const preSyncDuplicatePins = buildDuplicateAudit(liveIndex.duplicates, targetMatchKeys);

  if (liveIndex.boards.length) {
    cache.boards = buildNameMap(liveIndex.boards);
  }

  let processedTargets = 0;
  for (const target of targets) {
    const stored = findStoredMatch(store, target);
    const liveMatch = liveIndex.pins.get(target.matchKey) || null;
    const existing = mergeExistingMatch(stored, liveMatch);

    if (stored?.sourceKey) {
      claimedStoreKeys.add(stored.sourceKey);
    }

    try {
      const storedImageChanged = await hasImageContentChanged(selection.config, target, stored);
      const pendingStoredNeedsPinterestChange =
        stored &&
        !hasStoredPinterestPin(stored) &&
        (storedImageChanged || (stored.metadataSignature && stored.metadataSignature !== target.metadataSignature));

      if (liveMatch && (!stored || (!hasStoredPinterestPin(stored) && !pendingStoredNeedsPinterestChange))) {
        await hydrateTargetContentHash(selection.config, target);

        if (!dryRun) {
          nextPins[target.sourceKey] = buildStoredPinFromExisting(target, {
            ...liveMatch,
            source: "pinterest"
          });
          if (stored?.sourceKey && stored.sourceKey !== target.sourceKey) {
            delete nextPins[stored.sourceKey];
          }
        }

        actions.push({
          type: "matched",
          filename: target.filename,
          pinId: liveMatch.pinId,
          message: "Pin gia presente su Pinterest: agganciato al registro, nessun duplicato creato."
        });
        continue;
      }

      if (!hasStoredPinterestPin(existing)) {
        if (dryRun) {
          actions.push({ type: "created", filename: target.filename, pinId: "" });
          continue;
        }

        await hydrateTargetContentHash(selection.config, target);
        const createTarget = preserveExistingPrivacy(target, existing);
        const created = await createPinForTarget(selection.config, cache, createTarget);
        nextPins[target.sourceKey] = buildStoredPin(
          createTarget,
          created.pin,
          created.board,
          created.section
        );
        if (stored?.sourceKey && stored.sourceKey !== target.sourceKey) {
          delete nextPins[stored.sourceKey];
        }
        actions.push({ type: "created", filename: target.filename, pinId: created.pin.id });
        continue;
      }

      const imageChanged = await hasImageContentChanged(selection.config, target, existing);
      const metadataChanged = existing.metadataSignature && existing.metadataSignature !== target.metadataSignature;
      const locationChanged = existing.locationSignature
        ? existing.locationSignature !== target.locationSignature
        : (existing.serverRelativeUrl && existing.serverRelativeUrl !== target.serverRelativeUrl) ||
          (existing.filename && existing.filename !== target.filename);

      if (imageChanged) {
        if (dryRun) {
          actions.push({ type: "replaced", filename: target.filename, pinId: existing.pinId });
          continue;
        }

        await hydrateTargetContentHash(selection.config, target);
        await deletePinIfPresent(selection.config, existing.pinId);
        const replaceTarget = preserveExistingPrivacy(target, existing);
        const created = await createPinForTarget(selection.config, cache, replaceTarget);
        nextPins[target.sourceKey] = buildStoredPin(
          replaceTarget,
          created.pin,
          created.board,
          created.section
        );
        if (stored?.sourceKey && stored.sourceKey !== target.sourceKey) {
          delete nextPins[stored.sourceKey];
        }
        actions.push({ type: "replaced", filename: target.filename, pinId: created.pin.id });
        continue;
      }

      if (metadataChanged) {
        if (dryRun) {
          actions.push({ type: "replaced", filename: target.filename, pinId: existing.pinId });
          continue;
        }

        const replaceTarget = preserveExistingPrivacy(target, existing);
        await deletePinIfPresent(selection.config, existing.pinId);
        const created = await createPinForTarget(selection.config, cache, replaceTarget);
        nextPins[target.sourceKey] = buildStoredPin(
          replaceTarget,
          created.pin,
          created.board,
          created.section
        );
        if (stored?.sourceKey && stored.sourceKey !== target.sourceKey) {
          delete nextPins[stored.sourceKey];
        }
        actions.push({ type: "replaced", filename: target.filename, pinId: created.pin.id });
        continue;
      }

      if (locationChanged) {
        if (!dryRun) {
          nextPins[target.sourceKey] = buildStoredPinFromExisting(target, existing);
          if (stored?.sourceKey && stored.sourceKey !== target.sourceKey) {
            delete nextPins[stored.sourceKey];
          }
        }

        actions.push({ type: "relocated", filename: target.filename, pinId: existing.pinId });
        continue;
      }

      const shouldRefreshStoredRecord =
        !dryRun &&
        Boolean(target.contentHash) &&
        (!stored?.contentHash ||
          stored.imageSignature !== target.imageSignature ||
          stored.locationSignature !== target.locationSignature ||
          stored.sourceKey !== target.sourceKey);

      if (shouldRefreshStoredRecord) {
        nextPins[target.sourceKey] = buildStoredPinFromExisting(target, existing);
        if (stored?.sourceKey && stored.sourceKey !== target.sourceKey) {
          delete nextPins[stored.sourceKey];
        }

        actions.push({ type: "verified", filename: target.filename, pinId: existing.pinId });
        continue;
      }

      actions.push({ type: "unchanged", filename: target.filename, pinId: existing.pinId });
    } catch (error) {
      actions.push({
        type: "failed",
        filename: target.filename,
        pinId: existing?.pinId || "",
        error: error instanceof Error ? error.message : "Errore sync Pinterest."
      });
    } finally {
      processedTargets += 1;
      const action = actions.at(-1);
      emitProgress(onProgress, {
        scope: "sync",
        phase: dryRun ? "dry-run" : "push",
        current: processedTargets,
        total: targets.length,
        item: target.filename,
        action: action?.type || "",
        message: `${processedTargets}/${targets.length}: ${target.filename}`
      });
    }
  }

  for (const [sourceKey, existing] of Object.entries(store.pins)) {
    if (
      !selectedSubPathSet.has(existing.sourceSubPath) ||
      targetKeys.has(sourceKey) ||
      claimedStoreKeys.has(sourceKey)
    ) {
      continue;
    }

    try {
      if (!dryRun) {
        if (hasStoredPinterestPin(existing)) {
          await deletePinIfPresent(selection.config, existing.pinId);
        }
        delete nextPins[sourceKey];
      }

      actions.push({
        type: "deleted",
        filename: existing.filename,
        pinId: existing.pinId
      });
      emitProgress(onProgress, {
        scope: "sync",
        phase: "cleanup",
        current: processedTargets,
        total: targets.length,
        item: existing.filename,
        action: "deleted",
        message: `Eliminazione fuori selezione: ${existing.filename}`
      });
    } catch (error) {
      actions.push({
        type: "failed",
        filename: existing.filename,
        pinId: existing.pinId,
        error: error instanceof Error ? error.message : "Errore eliminazione Pinterest."
      });
      emitProgress(onProgress, {
        scope: "sync",
        phase: "cleanup",
        current: processedTargets,
        total: targets.length,
        item: existing.filename,
        action: "failed",
        message: `Errore eliminazione: ${existing.filename}`
      });
    }
  }

  const summary = summarizeActions(actions);
  const errors = summarizeErrors(actions);
  let audit = {
    duplicatePinterestPins: preSyncDuplicatePins
  };

  if (summary.failed && summary.failed === actions.length) {
    const primaryError = errors[0];
    const detail = primaryError
      ? `${primaryError.count} pin: ${primaryError.message}`
      : "nessuna operazione Pinterest e riuscita.";

    throw new Error(`Sync Pinterest non completato: ${summary.failed} errori, ${detail}`);
  }

  const run = {
    id: crypto.randomUUID(),
    dryRun,
    createdAt: new Date().toISOString(),
    selectedSubPaths: selection.selectedSubPaths,
    scannedCount: selection.files.length,
    selectedCount: targets.length,
    summary,
    errors: errors.slice(0, 5),
    audit
  };

  if (!dryRun) {
    emitProgress(onProgress, {
      scope: "sync",
      phase: "audit",
      current: targets.length,
      total: targets.length,
      message: "Audit finale su Pinterest."
    });
    const postSyncIndex = await loadPinterestPinIndexForTargets(selection.config, targets);
    audit = {
      duplicatePinterestPins: buildDuplicateAudit(postSyncIndex.duplicates, targetMatchKeys)
    };
    run.audit = audit;

    await savePinterestSyncStore(
      {
        version: 1,
        pins: nextPins,
        runs: [run, ...store.runs].slice(0, 25)
      },
      syncStore.persistent,
      syncStore.issue
    );
  }

  emitProgress(onProgress, {
    scope: "sync",
    phase: "ready",
    current: targets.length,
    total: targets.length,
    message: dryRun ? "Simulazione completata." : "Push Pinterest completato."
  });

  return {
    sourcePath:
      selection.sourcePaths.length === 1
        ? selection.sourcePaths[0]
        : `${selection.sourcePaths.length} cartelle selezionate`,
    sourcePaths: selection.sourcePaths,
    selectedSubPaths: selection.selectedSubPaths,
    rule: selection.selectedRule,
    scannedCount: selection.files.length,
    generatedCount: targets.length,
    skippedCount: selection.skipped.length,
    dryRun,
    summary,
    errors,
    audit,
    actions,
    storage: {
      persistent: syncStore.persistent,
      issue: syncStore.issue,
      label: syncStore.storageLabel
    }
  };
}
