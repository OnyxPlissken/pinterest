import path from "node:path";

import { BlobNotFoundError, head, put } from "@vercel/blob";

import { getConfig } from "./config";
import { getSharePointAccessToken } from "./sharepoint-auth";
import {
  collectImageFiles,
  downloadFileBuffer,
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

function combineSharePointPaths(baseFolder, subPath) {
  const sanitizedSubPath = sanitizeSubPath(subPath);
  if (!sanitizedSubPath) {
    return normalizeSlashes(baseFolder);
  }

  return `${normalizeSlashes(baseFolder).replace(/\/+$/g, "")}/${sanitizedSubPath}`;
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

function formatLookLabel(lookNumber) {
  return `Look ${lookNumber}`;
}

function formatSeasonLabel(rawSeason) {
  const compactSeason = String(rawSeason).replace(/[^a-z0-9]/gi, "").toUpperCase();
  const match = compactSeason.match(/^(SS|FW)(\d{2,4})$/);

  if (!match) {
    return rawSeason;
  }

  return `${match[1] === "SS" ? "Spring Summer" : "Fall Winter"} ${match[2]}`;
}

function selectPreferredFiles(files) {
  const selected = new Map();
  const skipped = [];

  for (const file of files) {
    const [season, assetType, collection] = file.relativeSegments;

    if (!season || !assetType || !collection) {
      skipped.push({
        file: file.relativePath,
        reason: "Percorso troppo corto"
      });
      continue;
    }

    const lookInfo = parseLookInfo(file.name);
    if (!lookInfo) {
      skipped.push({
        file: file.relativePath,
        reason: "LOOK non riconosciuto nel nome file"
      });
      continue;
    }

    const groupKey = [season, assetType, collection, lookInfo.lookNumber].join("||");
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
        season,
        assetType,
        collection
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

function sanitizeBlobSegment(value) {
  return String(value)
    .trim()
    .replace(/[<>:\"|?*]+/g, "")
    .replace(/\s+/g, "-");
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let index = 0;

  async function run() {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, () => run());
  await Promise.all(runners);
  return results;
}

async function ensurePublicBlob(pathname, contentType, loadBody) {
  try {
    return await head(pathname);
  } catch (error) {
    if (!(error instanceof BlobNotFoundError)) {
      throw error;
    }
  }

  const body = await loadBody();

  return put(pathname, body, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType
  });
}

function buildRowData(item, mediaUrl, config) {
  return {
    Title: `${config.pinterest.titlePrefix} ${item.season} ${item.assetType}`.trim(),
    "Media URL": mediaUrl,
    "Pinterest board": `${item.season} | ${item.collection}`,
    Thumbnail: getThumbnailValue(item.assetType, config.pinterest.thumbnailMode),
    Description: [
      `${config.pinterest.descriptionPrefix} ${formatSeasonLabel(item.season)}`.trim(),
      `${item.collection} ${item.assetType}`.trim(),
      item.collection,
      formatLookLabel(item.lookInfo.lookNumber)
    ].join(" | "),
    Link: config.pinterest.linkUrl,
    "Publish date": "",
    Keywords: ""
  };
}

function createGenerationKey(subPath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeSuffix = subPath ? `-${subPath.split("/").map(sanitizeBlobSegment).join("-")}` : "";
  return `${timestamp}${safeSuffix}`;
}

export async function generatePinterestCsv({ subPath = "" } = {}) {
  const config = getConfig();
  const token = await getSharePointAccessToken();
  const sourcePath = combineSharePointPaths(config.sharePoint.baseFolder, subPath);
  const generationKey = createGenerationKey(subPath);

  if (!sanitizeSubPath(subPath)) {
    throw new Error(
      "L'export completo di 02_Collezioni supera il limite di runtime Vercel. Seleziona almeno una stagione o un sotto-percorso, ad esempio SS26/Lookbook."
    );
  }

  await resolveSite(token, config.sharePoint);
  const folder = await resolveFolder(token, config.sharePoint, sourcePath);

  if (!folder.exists) {
    throw new Error(`Il percorso '${sourcePath}' non punta a una cartella SharePoint.`);
  }

  const files = await collectImageFiles(token, config.sharePoint, folder.serverRelativeUrl);
  const { selectedItems, skipped } = selectPreferredFiles(files);

  if (selectedItems.length === 0) {
    throw new Error("Nessuna immagine valida trovata nel percorso selezionato.");
  }

  const csvRows = await mapWithConcurrency(selectedItems, 8, async (item) => {
    const blobPath = [
      "pinterest",
      "assets",
      item.season,
      item.assetType,
      item.collection,
      ...item.file.relativeSegments.slice(3),
      item.file.name
    ]
      .map(sanitizeBlobSegment)
      .join("/");

    const blob = await ensurePublicBlob(blobPath, item.file.mimeType, () =>
      downloadFileBuffer(token, config.sharePoint, item.file.serverRelativeUrl)
    );

    return buildRowData(item, blob.url, config);
  });

  const csvContent = serializeCsv(csvRows);
  const csvBlob = await put(`pinterest/generated/pinterest-${generationKey}.csv`, csvContent, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "text/csv; charset=utf-8"
  });

  return {
    sourcePath,
    scannedCount: files.length,
    generatedCount: csvRows.length,
    skippedCount: skipped.length,
    csvUrl: csvBlob.url,
    csvDownloadUrl: csvBlob.downloadUrl
  };
}
