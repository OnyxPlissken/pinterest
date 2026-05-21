import crypto from "node:crypto";

import {
  createPinterestBoard,
  createPinterestBoardSection,
  createPinterestPin,
  deletePinterestPin,
  listPinterestBoardSections,
  listPinterestBoards,
  updatePinterestPin
} from "./pinterest-api";
import { buildAssetFingerprint } from "./asset-fingerprint";
import { loadPinterestSelection } from "./pinterest";
import {
  loadPinterestSyncStore,
  savePinterestSyncStore
} from "./pinterest-sync-store";

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
    metadataSignature: hashJson(metadata),
    metadata,
    lookNumber: resolveLookNumber(item, row),
    mediaUrl: row["Media URL"]
  };
}

async function ensureBoard(config, cache, boardName) {
  const boardKey = normalizePinterestName(boardName);

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
      board = await createPinterestBoard(config, boardName);
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

async function createPinForTarget(config, cache, target) {
  const board = await ensureBoard(config, cache, target.metadata.boardName);
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

async function updatePinForTarget(config, cache, existing, target) {
  const pinId = normalizePinId(existing?.pinId);
  if (!pinId) {
    throw new Error("Pin ID Pinterest mancante: il Pin va creato di nuovo invece di modificarlo.");
  }

  const board = await ensureBoard(config, cache, target.metadata.boardName);
  const section = await ensureSection(config, cache, board, target.metadata.sectionName);
  const pin = await updatePinterestPin(config, pinId, {
    boardId: board.id,
    boardSectionId: section?.id || "",
    title: target.metadata.title,
    description: target.metadata.description,
    link: target.metadata.link
  });

  return {
    pin,
    board,
    section
  };
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
    boardSectionId: section?.id || "",
    sectionName: target.metadata.sectionName,
    imageSignature: target.imageSignature,
    metadataSignature: target.metadataSignature,
    title: target.metadata.title,
    description: target.metadata.description,
    link: target.metadata.link,
    mediaUrl: target.mediaUrl,
    syncedAt: new Date().toISOString()
  };
}

function summarizeActions(actions) {
  return actions.reduce(
    (summary, action) => ({
      ...summary,
      [action.type]: (summary[action.type] || 0) + 1
    }),
    {
      created: 0,
      updated: 0,
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

export async function syncPinterestPins({
  subPaths = [],
  subPath = "",
  origin = "",
  ruleId = "",
  dryRun = false
} = {}) {
  const selection = await loadPinterestSelection({ subPaths, subPath, origin, ruleId });
  const syncStore = await loadPinterestSyncStore();
  const store = syncStore.store;
  const cache = {
    boards: null,
    sections: new Map()
  };
  const targets = selection.selectedItems
    .map((item, index) => buildPinTarget(item, selection.csvRows[index]))
    .sort(compareSyncTargetsForUpload);
  const targetKeys = new Set(targets.map((target) => target.sourceKey));
  const selectedSubPathSet = new Set(selection.selectedSubPaths);
  const actions = [];
  const nextPins = {
    ...store.pins
  };

  for (const target of targets) {
    const stored = store.pins[target.sourceKey];
    const existing = hasStoredPinterestPin(stored) ? stored : null;

    try {
      if (!existing) {
        if (dryRun) {
          actions.push({ type: "created", filename: target.filename, pinId: "" });
          continue;
        }

        const created = await createPinForTarget(selection.config, cache, target);
        nextPins[target.sourceKey] = buildStoredPin(
          target,
          created.pin,
          created.board,
          created.section
        );
        actions.push({ type: "created", filename: target.filename, pinId: created.pin.id });
        continue;
      }

      if (existing.imageSignature !== target.imageSignature) {
        if (dryRun) {
          actions.push({ type: "replaced", filename: target.filename, pinId: existing.pinId });
          continue;
        }

        await deletePinIfPresent(selection.config, existing.pinId);
        const created = await createPinForTarget(selection.config, cache, target);
        nextPins[target.sourceKey] = buildStoredPin(
          target,
          created.pin,
          created.board,
          created.section
        );
        actions.push({ type: "replaced", filename: target.filename, pinId: created.pin.id });
        continue;
      }

      if (
        existing.metadataSignature !== target.metadataSignature ||
        existing.serverRelativeUrl !== target.serverRelativeUrl ||
        existing.filename !== target.filename
      ) {
        if (dryRun) {
          actions.push({ type: "updated", filename: target.filename, pinId: existing.pinId });
          continue;
        }

        const updated = await updatePinForTarget(selection.config, cache, existing, target);
        nextPins[target.sourceKey] = buildStoredPin(
          target,
          updated.pin?.id ? updated.pin : { id: existing.pinId, url: existing.pinUrl },
          updated.board,
          updated.section
        );
        actions.push({ type: "updated", filename: target.filename, pinId: existing.pinId });
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
    }
  }

  for (const [sourceKey, existing] of Object.entries(store.pins)) {
    if (!selectedSubPathSet.has(existing.sourceSubPath) || targetKeys.has(sourceKey)) {
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
    } catch (error) {
      actions.push({
        type: "failed",
        filename: existing.filename,
        pinId: existing.pinId,
        error: error instanceof Error ? error.message : "Errore eliminazione Pinterest."
      });
    }
  }

  const summary = summarizeActions(actions);
  const errors = summarizeErrors(actions);

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
    errors: errors.slice(0, 5)
  };

  if (!dryRun) {
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
    actions,
    storage: {
      persistent: syncStore.persistent,
      issue: syncStore.issue,
      label: syncStore.storageLabel
    }
  };
}
