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
import { collectImageFiles, resolveFolder, resolveSite } from "./sharepoint-client";

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
  return String(segment || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase() === "final jpeg";
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

function selectPreferredFiles(files) {
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
    selectedItems: Array.from(selected.values()).sort((left, right) =>
      left.file.relativePath.localeCompare(right.file.relativePath, "it")
    ),
    skipped
  };
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

function buildSelectionCacheKey({ config, normalizedSubPaths, origin, ruleId }) {
  return JSON.stringify({
    origin,
    ruleId,
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

async function loadFilesForTarget(token, config, targetSubPath) {
  const sourcePath = combineSharePointPaths(config.sharePoint.baseFolder, targetSubPath);
  const folder = await resolveFolder(token, config.sharePoint, sourcePath);

  if (!folder.exists) {
    throw new Error(`Il percorso '${sourcePath}' non punta a una cartella SharePoint.`);
  }

  const files = await collectImageFiles(token, config.sharePoint, folder.serverRelativeUrl);

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

export async function loadPinterestSelection({
  subPaths = [],
  subPath = "",
  origin = "",
  ruleId = "",
  forceRefresh = false
} = {}) {
  const runtime = await getRuntimeConfig(ruleId);
  const config = runtime.config;
  const normalizedSubPaths = normalizeTargetSubPaths(subPaths, subPath);
  const cacheKey = buildSelectionCacheKey({
    config,
    normalizedSubPaths,
    origin,
    ruleId
  });
  const cachedSelection = forceRefresh ? null : getCachedSelection(cacheKey);
  if (cachedSelection) {
    return cachedSelection;
  }

  const token = await getSharePointAccessToken();
  await resolveSite(token, config.sharePoint);

  const loadedTargets = await mapWithConcurrency(
    normalizedSubPaths,
    4,
    (targetSubPath) => loadFilesForTarget(token, config, targetSubPath)
  );

  const allFiles = loadedTargets.flatMap((target) => target.files);
  const { selectedItems, skipped } = selectPreferredFiles(allFiles);

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

  const selection = {
    config,
    selectedRule: runtime.selectedRule,
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

function buildPreviewItem(item, row) {
  return {
    imageUrl: row["Media URL"],
    title: row.Title,
    description: row.Description,
    board: row["Pinterest board"],
    link: row.Link,
    section: buildClassificationLabels(item).join(" | "),
    collection: item.collection,
    look: formatLookLabel(item.lookInfo.lookNumber),
    filename: item.file.name,
    sourceSubPath: item.sourceSubPath,
    imageFolder: path.posix.dirname(item.file.relativePath),
    selectionRule: "Per ogni LOOK viene tenuto solo il file con numero finale piu basso.",
    assetVersion: buildAssetFingerprint(item.file)
  };
}

export async function previewPinterestSelection({
  subPaths = [],
  subPath = "",
  origin = "",
  ruleId = "",
  limit = 8
} = {}) {
  const selection = await loadPinterestSelection({ subPaths, subPath, origin, ruleId });

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
    previewItems: selection.selectedItems
      .slice(0, limit)
      .map((item, index) => buildPreviewItem(item, selection.csvRows[index]))
  };
}

export async function generatePinterestCsv({ subPaths = [], subPath = "", origin = "", ruleId = "" } = {}) {
  const selection = await loadPinterestSelection({ subPaths, subPath, origin, ruleId });
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
    csvContent,
    csvFilename: `pinterest-${generationKey}.csv`,
    previewMediaUrl: selection.csvRows[0]?.["Media URL"] ?? ""
  };
}
