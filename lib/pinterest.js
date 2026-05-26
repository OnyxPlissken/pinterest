import path from "node:path";

import { getRuntimeConfig } from "./admin-store";
import {
  formatAssetTypeLabel,
  formatLookLabel,
  formatSeasonLabel
} from "./pinterest-format";
import { buildAssetFingerprint } from "./asset-fingerprint";
import { buildPublicMediaUrl } from "./media-url";
import { getSharePointAccessToken } from "./sharepoint-auth";
import {
  collectImageFiles,
  listFolderEntries,
  resolveFolder,
  resolveSite
} from "./sharepoint-client";

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
const SELECTION_CACHE_TTL_MS = 2 * 60 * 1000;
const MAX_SELECTION_CACHE_ENTRIES = 30;
const DEFAULT_SELECTION_MODE = "filenameLook";
const IMAGE_SEQUENCE_SELECTION_MODE = "imageSequence";
const NATURAL_SORTER = new Intl.Collator("it-IT", {
  numeric: true,
  sensitivity: "base"
});
const selectionCache = globalThis.__isaiaPinterestSelectionCache ?? new Map();
globalThis.__isaiaPinterestSelectionCache = selectionCache;

function normalizeSlashes(value) {
  return String(value).replaceAll("\\", "/");
}

function sanitizeSubPath(subPath) {
  const normalized = normalizeSlashes(subPath).trim().replace(/^\/+|\/+$/g, "");
  if (!normalized) {
    return "";
  }

  const segments = normalized.split("/").filter(Boolean);
  if (segments.some((segment) => segment === "." || segment === "..")) {
    throw new Error("Il sotto-percorso contiene segmenti non validi.");
  }

  return segments.join("/");
}

function normalizeTargetSubPaths(subPaths = [], subPath = "") {
  const values = Array.isArray(subPaths) ? subPaths : [];
  const candidates = [...values, subPath];
  const normalized = Array.from(
    new Set(
      candidates
        .map((candidate) => sanitizeSubPath(candidate))
        .filter(Boolean)
    )
  );

  if (!normalized.length) {
    throw new Error(
      "Seleziona almeno una sotto-sotto-cartella, ad esempio SS26/LOOKBOOK/Lookbook ss26."
    );
  }

  for (const value of normalized) {
    const segments = value.split("/").filter(Boolean);
    if (segments.length < 3) {
      throw new Error(
        "Seleziona percorsi completi di stagione, sotto-cartella e sotto-sotto-cartella."
      );
    }
  }

  return normalized.sort((left, right) => left.localeCompare(right, "it"));
}

function combineSharePointPaths(baseFolder, subPath) {
  return `${normalizeSlashes(baseFolder).replace(/\/+$/g, "")}/${sanitizeSubPath(subPath)}`;
}

function parseLookInfo(filename) {
  const extension = path.posix.extname(filename);
  const basename = path.posix.basename(filename, extension);
  const match = basename.match(/LOOK[_\-\s]?0*(\d+)(?:[_\-\s]+0*(\d+))?/i);

  if (!match) {
    return null;
  }

  return {
    lookNumber: Number.parseInt(match[1], 10),
    frameNumber: match[2] ? Number.parseInt(match[2], 10) : Number.MAX_SAFE_INTEGER
  };
}

function isFinalJpegFolder(segment) {
  const normalized = String(segment || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  return normalized === "final jpeg" || normalized === "final jpg";
}

function splitSubPath(value) {
  return String(value || "").split("/").filter(Boolean);
}

function buildFileContext(targetSubPath, file) {
  const targetSegments = targetSubPath.split("/").filter(Boolean);
  const parentSegments = [...targetSegments, ...(file.relativeSegments || [])];
  const finalJpegIndex = parentSegments.findIndex(isFinalJpegFolder);
  const metadataSegments =
    finalJpegIndex >= 0 ? parentSegments.slice(0, finalJpegIndex) : parentSegments;

  return {
    targetSubPath,
    season: metadataSegments[0] || targetSegments[0] || "",
    assetType: metadataSegments[1] || targetSegments[1] || "",
    collection: metadataSegments[2] || targetSegments[2] || "",
    detailSegments: metadataSegments.slice(3)
  };
}

function buildClassificationLabels(item) {
  return [
    formatAssetTypeLabel(item.assetType),
    ...(item.detailSegments || []).map(formatAssetTypeLabel)
  ].filter(Boolean);
}

function comparePinterestItems(left, right) {
  return (
    NATURAL_SORTER.compare(String(left.season || ""), String(right.season || "")) ||
    NATURAL_SORTER.compare(String(left.assetType || ""), String(right.assetType || "")) ||
    NATURAL_SORTER.compare(String(left.collection || ""), String(right.collection || "")) ||
    NATURAL_SORTER.compare(
      (left.detailSegments || []).join("/"),
      (right.detailSegments || []).join("/")
    ) ||
    NATURAL_SORTER.compare(String(left.sourceSubPath || ""), String(right.sourceSubPath || "")) ||
    (left.lookInfo?.lookNumber ?? 0) - (right.lookInfo?.lookNumber ?? 0) ||
    (left.lookInfo?.frameNumber ?? 0) - (right.lookInfo?.frameNumber ?? 0) ||
    NATURAL_SORTER.compare(left.file.relativePath, right.file.relativePath)
  );
}

function selectPreferredFilesByFilenameLook(files) {
  const selected = new Map();
  const skipped = [];

  for (const file of files) {
    const lookInfo = parseLookInfo(file.name);
    if (!lookInfo) {
      skipped.push({
        file: file.relativePath,
        reason: "LOOK non riconosciuto nel nome file"
      });
      continue;
    }

    const groupKey = [
      file.context.season,
      file.context.assetType,
      file.context.collection,
      (file.context.detailSegments || []).join("/"),
      lookInfo.lookNumber
    ].join("||");
    const current = selected.get(groupKey);

    if (!current || lookInfo.frameNumber < current.lookInfo.frameNumber) {
      if (current) {
        skipped.push({
          file: current.file.relativePath,
          reason: "Scartata variante con numero piu alto"
        });
      }

      selected.set(groupKey, {
        file,
        lookInfo,
        season: file.context.season,
        assetType: file.context.assetType,
        collection: file.context.collection,
        detailSegments: file.context.detailSegments || [],
        sourceSubPath: file.context.targetSubPath
      });
    } else {
      skipped.push({
        file: file.relativePath,
        reason: "Scartata variante con numero piu alto"
      });
    }
  }

  return {
    selectedItems: Array.from(selected.values()).sort(comparePinterestItems),
    skipped
  };
}

function getImageSequenceGroupKey(file) {
  const folderSegments = path.posix.dirname(file.relativePath).split("/").filter(Boolean);
  const finalJpegIndex = folderSegments.findIndex(isFinalJpegFolder);
  const sequenceSegments =
    finalJpegIndex >= 0 ? folderSegments.slice(0, finalJpegIndex + 1) : folderSegments;

  return sequenceSegments.join("/");
}

function selectEveryImageAsLook(files) {
  const groups = new Map();

  for (const file of files) {
    const groupKey = getImageSequenceGroupKey(file);
    const group = groups.get(groupKey) || [];
    group.push(file);
    groups.set(groupKey, group);
  }

  const selectedItems = [];
  const sortedGroups = Array.from(groups.entries()).sort(([left], [right]) =>
    NATURAL_SORTER.compare(left, right)
  );

  for (const [, groupFiles] of sortedGroups) {
    const sortedFiles = [...groupFiles].sort((left, right) =>
      NATURAL_SORTER.compare(left.relativePath, right.relativePath)
    );

    sortedFiles.forEach((file, index) => {
      selectedItems.push({
        file,
        lookInfo: {
          lookNumber: index + 1,
          frameNumber: 1,
          generatedSequence: true
        },
        season: file.context.season,
        assetType: file.context.assetType,
        collection: file.context.collection,
        detailSegments: file.context.detailSegments || [],
        sourceSubPath: file.context.targetSubPath
      });
    });
  }

  return {
    selectedItems: selectedItems.sort(comparePinterestItems),
    skipped: []
  };
}

function selectPreferredFiles(files, selectionMode = DEFAULT_SELECTION_MODE) {
  if (selectionMode === IMAGE_SEQUENCE_SELECTION_MODE) {
    return selectEveryImageAsLook(files);
  }

  return selectPreferredFilesByFilenameLook(files);
}

function getThumbnailValue(assetType, thumbnailMode) {
  return thumbnailMode === "level5" ? assetType : "";
}

function escapeCsvValue(value) {
  const stringValue = String(value ?? "");
  if (!/[",\n]/.test(stringValue)) {
    return stringValue;
  }

  return `\"${stringValue.replaceAll('\"', '\"\"')}\"`;
}

function serializeCsv(rows) {
  const lines = [
    CSV_HEADERS.join(","),
    ...rows.map((row) =>
      CSV_HEADERS.map((header) => escapeCsvValue(row[header] ?? "")).join(",")
    )
  ];

  return lines.join("\n");
}

function sanitizePinterestPathSegment(value) {
  return String(value ?? "")
    .trim()
    .replaceAll("/", "-");
}

function sanitizeFileSegment(value) {
  return String(value)
    .trim()
    .replace(/[<>:"|?*]+/g, "")
    .replace(/\s+/g, "-");
}

function buildRowData(item, mediaUrl, config) {
  const classificationLabels = buildClassificationLabels(item);
  const lookLabel = formatLookLabel(item.lookInfo.lookNumber);

  const boardName = `${item.season} | ${item.collection}`;
  const sectionName = classificationLabels.join(" | ");

  return {
    Title: `${config.pinterest.titlePrefix} ${item.season} ${classificationLabels.join(" | ")} | ${lookLabel}`.trim(),
    "Media URL": mediaUrl,
    "Pinterest board": `${sanitizePinterestPathSegment(boardName)}/${sanitizePinterestPathSegment(sectionName)}`,
    Thumbnail: "",
    Description: [
      `${config.pinterest.descriptionPrefix} ${formatSeasonLabel(item.season)}`.trim(),
      item.collection,
      ...classificationLabels,
      lookLabel
    ].join(" | "),
    Link: config.pinterest.linkUrl,
    "Publish date": "",
    Keywords: ""
  };
}

function getSourceKey(item) {
  return item.file.uniqueId || item.file.serverRelativeUrl;
}

function normalizeRowEdits(rowEdits = []) {
  const edits = new Map();

  if (!Array.isArray(rowEdits)) {
    return edits;
  }

  for (const edit of rowEdits) {
    const sourceKey = String(edit?.sourceKey || "").trim();
    if (!sourceKey) {
      continue;
    }

    const normalized = {};
    if (Object.prototype.hasOwnProperty.call(edit, "title")) {
      normalized.Title = String(edit.title ?? "");
    }
    if (Object.prototype.hasOwnProperty.call(edit, "description")) {
      normalized.Description = String(edit.description ?? "");
    }
    if (Object.prototype.hasOwnProperty.call(edit, "link")) {
      normalized.Link = String(edit.link ?? "");
    }
    if (Object.prototype.hasOwnProperty.call(edit, "board")) {
      normalized["Pinterest board"] = String(edit.board ?? "");
    }

    if (Object.keys(normalized).length) {
      edits.set(sourceKey, normalized);
    }
  }

  return edits;
}

export function applyPinterestRowEdits(selection, rowEdits = []) {
  const edits = normalizeRowEdits(rowEdits);
  if (!edits.size) {
    return selection;
  }

  return {
    ...selection,
    csvRows: selection.csvRows.map((row, index) => {
      const sourceKey = getSourceKey(selection.selectedItems[index]);
      const edit = edits.get(sourceKey);

      return edit ? { ...row, ...edit } : { ...row };
    })
  };
}

function createGenerationKey(subPaths) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const signature =
    subPaths.length === 1
      ? subPaths[0].split("/").map(sanitizeFileSegment).join("-")
      : `${subPaths.length}-cartelle`;

  return `${timestamp}-${signature}`;
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );
  return results;
}

function buildSelectionCacheKey({ config, normalizedSubPaths, origin, ruleId, selectionMode }) {
  return JSON.stringify({
    origin,
    ruleId,
    selectionMode,
    subPaths: normalizedSubPaths,
    sharePoint: {
      hostname: config.sharePoint.hostname,
      sitePath: config.sharePoint.sitePath,
      driveName: config.sharePoint.driveName,
      baseFolder: config.sharePoint.baseFolder
    },
    pinterest: {
      titlePrefix: config.pinterest.titlePrefix,
      descriptionPrefix: config.pinterest.descriptionPrefix,
      linkUrl: config.pinterest.linkUrl,
      thumbnailMode: config.pinterest.thumbnailMode
    },
    app: {
      publicOrigin: config.app.publicOrigin
    }
  });
}

function getCachedSelection(cacheKey) {
  const cached = selectionCache.get(cacheKey);
  if (!cached || cached.expiresAt <= Date.now()) {
    selectionCache.delete(cacheKey);
    return null;
  }

  return cached.value;
}

function setCachedSelection(cacheKey, value) {
  selectionCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + SELECTION_CACHE_TTL_MS
  });

  if (selectionCache.size <= MAX_SELECTION_CACHE_ENTRIES) {
    return;
  }

  const firstKey = selectionCache.keys().next().value;
  if (firstKey) {
    selectionCache.delete(firstKey);
  }
}

function emitProgress(onProgress, event) {
  if (typeof onProgress === "function") {
    onProgress(event);
  }
}

function getSelectionRuleLabel(selectionMode = DEFAULT_SELECTION_MODE) {
  return selectionMode === IMAGE_SEQUENCE_SELECTION_MODE
    ? "Ogni immagine valida diventa un Look progressivo: Look 1, Look 2, Look 3..."
    : "Per ogni LOOK viene tenuto solo il file con numero finale piu basso.";
}

async function loadFilesForTarget(token, config, targetSubPath) {
  const sourcePath = combineSharePointPaths(config.sharePoint.baseFolder, targetSubPath);

  const files = await collectBoundedImageFiles(token, config, targetSubPath);

  return {
    sourcePath,
    targetSubPath,
    files: files.map((file) => ({
      ...file,
      relativePath: `${targetSubPath}/${file.relativePath}`.replace(/\/+$/g, ""),
      context: buildFileContext(targetSubPath, file)
    }))
  };
}

async function listTargetEntries(token, config, subPath) {
  return listFolderEntries(
    token,
    config.sharePoint,
    combineSharePointPaths(config.sharePoint.baseFolder, subPath)
  );
}

function getRelativeSegmentsFromTarget(targetSubPath, sourceSubPath) {
  const targetSegments = splitSubPath(targetSubPath);
  const sourceSegments = splitSubPath(sourceSubPath);

  return sourceSegments.slice(targetSegments.length);
}

function buildDirectImageFiles(payload, targetSubPath, sourceSubPath) {
  const relativeSegments = getRelativeSegmentsFromTarget(targetSubPath, sourceSubPath);

  return (payload.files ?? [])
    .filter((file) => file.isImage)
    .map((file) => ({
      name: file.name,
      mimeType: file.mimeType,
      relativeSegments,
      relativePath: [...relativeSegments, file.name].join("/"),
      serverRelativeUrl: file.serverRelativeUrl,
      size: Number(file.size ?? 0),
      modifiedAt: file.modifiedAt || "",
      uniqueId: file.uniqueId || ""
    }));
}

async function collectRecursiveImagesFromSubPath(token, config, targetSubPath, sourceSubPath) {
  const sourcePath = combineSharePointPaths(config.sharePoint.baseFolder, sourceSubPath);
  const folder = await resolveFolder(token, config.sharePoint, sourcePath);

  if (!folder.exists) {
    throw new Error(`Il percorso '${sourcePath}' non punta a una cartella SharePoint.`);
  }

  return collectImageFiles(
    token,
    config.sharePoint,
    folder.serverRelativeUrl,
    getRelativeSegmentsFromTarget(targetSubPath, sourceSubPath)
  );
}

async function collectImagesAtSelectionBoundary(token, config, targetSubPath, sourceSubPath) {
  const payload = await listTargetEntries(token, config, sourceSubPath);
  const directImages = buildDirectImageFiles(payload, targetSubPath, sourceSubPath);
  const finalJpegFolders = (payload.folders ?? []).filter((folder) =>
    isFinalJpegFolder(folder.name)
  );

  if (!directImages.length && !finalJpegFolders.length) {
    return {
      files: [],
      children: (payload.folders ?? [])
        .filter((folder) => !isFinalJpegFolder(folder.name))
        .map((folder) => folder.subPath)
    };
  }

  const finalJpegFiles = await mapWithConcurrency(finalJpegFolders, 4, (folder) =>
    collectRecursiveImagesFromSubPath(token, config, targetSubPath, folder.subPath)
  );

  return {
    files: [...directImages, ...finalJpegFiles.flat()],
    children: []
  };
}

async function collectBoundedImageFiles(token, config, targetSubPath) {
  const files = [];
  const visited = new Set();
  const queue = [targetSubPath];

  while (queue.length) {
    const batch = queue.splice(0, 4);
    const results = await Promise.all(
      batch.map(async (subPath) => {
        const normalizedSubPath = sanitizeSubPath(subPath);
        if (!normalizedSubPath || visited.has(normalizedSubPath)) {
          return { files: [], children: [] };
        }

        visited.add(normalizedSubPath);
        return collectImagesAtSelectionBoundary(token, config, targetSubPath, normalizedSubPath);
      })
    );

    for (const result of results) {
      files.push(...result.files);
      queue.push(...result.children);
    }
  }

  return files;
}

export async function loadPinterestSelection({
  subPaths = [],
  subPath = "",
  origin = "",
  ruleId = "",
  forceRefresh = false,
  onProgress = null
} = {}) {
  const runtime = await getRuntimeConfig(ruleId);
  const config = runtime.config;
  const selectionMode = runtime.selectedRule?.selectionMode || DEFAULT_SELECTION_MODE;
  const normalizedSubPaths = normalizeTargetSubPaths(subPaths, subPath);
  const cacheKey = buildSelectionCacheKey({
    config,
    normalizedSubPaths,
    origin,
    ruleId,
    selectionMode
  });
  const cachedSelection = forceRefresh ? null : getCachedSelection(cacheKey);
  if (cachedSelection) {
    emitProgress(onProgress, {
      scope: "preview",
      phase: "cache",
      current: normalizedSubPaths.length,
      total: normalizedSubPaths.length,
      message: "Anteprima recuperata dalla cache."
    });
    return cachedSelection;
  }

  emitProgress(onProgress, {
    scope: "preview",
    phase: "sharepoint",
    current: 0,
    total: normalizedSubPaths.length,
    message: "Connessione a SharePoint."
  });

  const token = await getSharePointAccessToken();
  await resolveSite(token, config.sharePoint);

  let loadedCount = 0;
  const loadedTargets = await mapWithConcurrency(
    normalizedSubPaths,
    4,
    async (targetSubPath) => {
      emitProgress(onProgress, {
        scope: "preview",
        phase: "sharepoint",
        current: loadedCount,
        total: normalizedSubPaths.length,
        item: targetSubPath,
        message: `Lettura ${targetSubPath}`
      });
      const target = await loadFilesForTarget(token, config, targetSubPath);
      loadedCount += 1;
      emitProgress(onProgress, {
        scope: "preview",
        phase: "sharepoint",
        current: loadedCount,
        total: normalizedSubPaths.length,
        item: targetSubPath,
        count: target.files.length,
        message: `${targetSubPath}: ${target.files.length} file letti`
      });
      return target;
    }
  );

  const allFiles = loadedTargets.flatMap((target) => target.files);
  emitProgress(onProgress, {
    scope: "preview",
    phase: "selection",
    current: allFiles.length,
    total: allFiles.length,
    message: `Analisi di ${allFiles.length} immagini.`
  });
  const { selectedItems, skipped } = selectPreferredFiles(allFiles, selectionMode);

  if (selectedItems.length === 0) {
    throw new Error("Nessuna immagine valida trovata nei percorsi selezionati.");
  }

  const csvRows = selectedItems.map((item) =>
    buildRowData(
      item,
      buildPublicMediaUrl(item.file.serverRelativeUrl, origin, buildAssetFingerprint(item.file)),
      config
    )
  );

  emitProgress(onProgress, {
    scope: "preview",
    phase: "ready",
    current: selectedItems.length,
    total: selectedItems.length,
    message: `${selectedItems.length} Pin validi preparati.`
  });

  const selection = {
    config,
    selectedRule: runtime.selectedRule,
    selectionMode,
    selectionRule: getSelectionRuleLabel(selectionMode),
    settings: runtime.settings,
    selectedSubPaths: normalizedSubPaths,
    sourcePaths: loadedTargets.map((target) => target.sourcePath),
    files: allFiles,
    selectedItems,
    skipped,
    csvRows
  };

  setCachedSelection(cacheKey, selection);
  return selection;
}

function buildPreviewItem(item, row, selectionRule) {
  const [boardName = row["Pinterest board"], sectionPath = ""] = String(row["Pinterest board"] || "").split("/");

  return {
    sourceKey: getSourceKey(item),
    imageUrl: row["Media URL"],
    title: row.Title,
    description: row.Description,
    board: row["Pinterest board"],
    boardName,
    link: row.Link,
    section: sectionPath || buildClassificationLabels(item).join(" | "),
    collection: item.collection,
    look: formatLookLabel(item.lookInfo.lookNumber),
    filename: item.file.name,
    sourceSubPath: item.sourceSubPath,
    imageFolder: path.posix.dirname(item.file.relativePath),
    selectionRule,
    assetVersion: buildAssetFingerprint(item.file)
  };
}

export async function previewPinterestSelection({
  subPaths = [],
  subPath = "",
  origin = "",
  ruleId = "",
  forceRefresh = false,
  rowEdits = [],
  onProgress = null
} = {}) {
  const selection = applyPinterestRowEdits(
    await loadPinterestSelection({ subPaths, subPath, origin, ruleId, forceRefresh, onProgress }),
    rowEdits
  );

  return {
    sourcePath:
      selection.sourcePaths.length === 1
        ? selection.sourcePaths[0]
        : `${selection.sourcePaths.length} cartelle selezionate`,
    sourcePaths: selection.sourcePaths,
    selectedSubPaths: selection.selectedSubPaths,
    rule: selection.selectedRule,
    scannedCount: selection.files.length,
    generatedCount: selection.csvRows.length,
    skippedCount: selection.skipped.length,
    selectionMode: selection.selectionMode,
    selectionRule: selection.selectionRule,
    previewItems: selection.selectedItems.map((item, index) =>
      buildPreviewItem(item, selection.csvRows[index], selection.selectionRule)
    )
  };
}

export async function generatePinterestCsv({
  subPaths = [],
  subPath = "",
  origin = "",
  ruleId = "",
  rowEdits = []
} = {}) {
  const selection = applyPinterestRowEdits(
    await loadPinterestSelection({ subPaths, subPath, origin, ruleId }),
    rowEdits
  );
  const generationKey = createGenerationKey(selection.selectedSubPaths);
  const csvContent = serializeCsv(selection.csvRows);

  return {
    sourcePath:
      selection.sourcePaths.length === 1
        ? selection.sourcePaths[0]
        : `${selection.sourcePaths.length} cartelle selezionate`,
    sourcePaths: selection.sourcePaths,
    selectedSubPaths: selection.selectedSubPaths,
    rule: selection.selectedRule,
    scannedCount: selection.files.length,
    generatedCount: selection.csvRows.length,
    skippedCount: selection.skipped.length,
    selectionMode: selection.selectionMode,
    selectionRule: selection.selectionRule,
    csvContent,
    csvFilename: `pinterest-${generationKey}.csv`,
    previewMediaUrl: selection.csvRows[0]?.["Media URL"] ?? ""
  };
}
