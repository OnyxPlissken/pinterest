import { buildContentHash } from "./asset-fingerprint";
import { getSharePointAccessToken } from "./sharepoint-auth";
import { downloadFileBuffer } from "./sharepoint-client";

const contentHashCache = globalThis.__isaiaSharePointContentHashCache ?? new Map();
globalThis.__isaiaSharePointContentHashCache = contentHashCache;

const CONTENT_HASH_CACHE_TTL_MS = 30 * 1000;
const MAX_CONTENT_HASH_CACHE_ENTRIES = 300;

function getContentHashCacheKey(config, serverRelativeUrl, assetSignature = "") {
  return [
    config.hostname,
    config.sitePath,
    String(serverRelativeUrl || "").trim(),
    String(assetSignature || "").trim()
  ].join("||");
}

function pruneContentHashCache() {
  const now = Date.now();
  for (const [key, entry] of contentHashCache.entries()) {
    if (!entry || entry.expiresAt <= now) {
      contentHashCache.delete(key);
    }
  }
}

export async function getSharePointFileContentHash(config, file) {
  const serverRelativeUrl = String(file?.serverRelativeUrl || "").trim();
  if (!serverRelativeUrl) {
    throw new Error("Impossibile calcolare hash contenuto: URL SharePoint mancante.");
  }

  const cacheKey = getContentHashCacheKey(config, serverRelativeUrl, file?.imageSignature);
  const cached = contentHashCache.get(cacheKey);

  if (cached?.expiresAt > Date.now()) {
    return cached.value;
  }

  const token = await getSharePointAccessToken();
  const buffer = await downloadFileBuffer(token, config, serverRelativeUrl);
  const value = buildContentHash(buffer);

  contentHashCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + CONTENT_HASH_CACHE_TTL_MS
  });

  if (contentHashCache.size > MAX_CONTENT_HASH_CACHE_ENTRIES) {
    pruneContentHashCache();
  }

  return value;
}
