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
    mediaUrl: row["Media URL"]
  };
}

async function ensureBoard(config, cache, boardName) {
  if (!cache.boards) {
    const boards = await listPinterestBoards(config);
    cache.boards = new Map(boards.map((board) => [board.name, board]));
  }

  let board = cache.boards.get(boardName);
  if (!board) {
    board = await createPinterestBoard(config, boardName);
    cache.boards.set(boardName, board);
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
    cache.sections.set(boardId, new Map(sections.map((section) => [section.name, section])));
  }

  const sections = cache.sections.get(boardId);
  let section = sections.get(sectionName);
  if (!section) {
    section = await createPinterestBoardSection(config, boardId, sectionName);
    sections.set(sectionName, section);
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
  try {
    await deletePinterestPin(config, pinId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "");
    if (!message.includes("Pinterest API 404")) {
      throw error;
    }
  }
}

async function updatePinForTarget(config, cache, existing, target) {
  const board = await ensureBoard(config, cache, target.metadata.boardName);
  const section = await ensureSection(config, cache, board, target.metadata.sectionName);
  const pin = await updatePinterestPin(config, existing.pinId, {
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
  const targets = selection.selectedItems.map((item, index) =>
    buildPinTarget(item, selection.csvRows[index])
  );
  const targetKeys = new Set(targets.map((target) => target.sourceKey));
  const selectedSubPathSet = new Set(selection.selectedSubPaths);
  const actions = [];
  const nextPins = {
    ...store.pins
  };

  for (const target of targets) {
    const existing = store.pins[target.sourceKey];

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
        await deletePinIfPresent(selection.config, existing.pinId);
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
  const run = {
    id: crypto.randomUUID(),
    dryRun,
    createdAt: new Date().toISOString(),
    selectedSubPaths: selection.selectedSubPaths,
    scannedCount: selection.files.length,
    selectedCount: targets.length,
    summary
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
    actions,
    storage: {
      persistent: syncStore.persistent,
      issue: syncStore.issue,
      label: syncStore.storageLabel
    }
  };
}
