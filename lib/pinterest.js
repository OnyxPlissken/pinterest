import path from "node:path";

import { getConfig } from "./config";
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

function formatAssetTypeLabel(rawAssetType) {
  return String(rawAssetType)
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");
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

function sanitizeFileSegment(value) {
  return String(value)
    .trim()
    .replace(/[<>:\"|?*]+/g, "")
    .replace(/\s+/g, "-");
}

function buildRowData(item, mediaUrl, config) {
  const assetTypeLabel = formatAssetTypeLabel(item.assetType);

  return {
    Title: `${config.pinterest.titlePrefix} ${item.season} ${assetTypeLabel}`.trim(),
    "Media URL": mediaUrl,
    "Pinterest board": `${item.season} | ${item.collection}`,
    Thumbnail: getThumbnailValue(item.assetType, config.pinterest.thumbnailMode),
    Description: [
      `${config.pinterest.descriptionPrefix} ${formatSeasonLabel(item.season)}`.trim(),
      item.collection,
      assetTypeLabel,
      formatLookLabel(item.lookInfo.lookNumber)
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

async function loadFilesForTarget(token, config, targetSubPath) {
  const sourcePath = combineSharePointPaths(config.sharePoint.baseFolder, targetSubPath);
  const [season, assetType, collection] = targetSubPath.split("/");
  const folder = await resolveFolder(token, config.sharePoint, sourcePath);

  if (!folder.exists) {
    throw new Error(`Il percorso '${sourcePath}' non punta a una cartella SharePoint.`);
  }

  const files = await collectImageFiles(token, config.sharePoint, folder.serverRelativeUrl);

  return {
    sourcePath,
    targetSubPath,
    season,
    assetType,
    collection,
    files: files.map((file) => ({
      ...file,
      relativePath: `${targetSubPath}/${file.relativePath