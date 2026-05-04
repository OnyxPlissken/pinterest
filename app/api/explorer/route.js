import { getRuntimeConfig } from "../../../lib/admin-store";
import { buildAssetFingerprint } from "../../../lib/asset-fingerprint";
import { buildPublicMediaUrl } from "../../../lib/media-url";
import { normalizeOperationalError } from "../../../lib/operational-errors";
import { getSharePointAccessToken } from "../../../lib/sharepoint-auth";
import { listFolderEntries } from "../../../lib/sharepoint-client";

export const runtime = "nodejs";
export const maxDuration = 300;

const EXPLORER_CACHE_TTL_MS = 3 * 60 * 1000;
const explorerCache = globalThis.__isaiaExplorerCache ?? new Map();
globalThis.__isaiaExplorerCache = explorerCache;

function buildExplorerCacheKey(config, subPath) {
  return [
    config.hostname,
    config.sitePath,
    config.driveName,
    config.baseFolder,
    subPath
  ].join("||");
}

function pruneExplorerCache() {
  const now = Date.now();
  for (const [key, entry] of explorerCache.entries()) {
    if (!entry || entry.expiresAt <= now) {
      explorerCache.delete(key);
    }
  }
}

export async function GET(request) {
  try {
    const runtimeConfig = await getRuntimeConfig();
    const subPath = request.nextUrl.searchParams.get("subPath") ?? "";
    const forceRefresh = request.nextUrl.searchParams.get("refresh") === "1";
    const folderPath = subPath
      ? `${runtimeConfig.config.sharePoint.baseFolder}/${subPath}`
      : runtimeConfig.config.sharePoint.baseFolder;
    const cacheKey = buildExplorerCacheKey(runtimeConfig.config.sharePoint, subPath);
    const cached = explorerCache.get(cacheKey);

    let explorer = null;
    if (!forceRefresh && cached?.expiresAt > Date.now()) {
      explorer = cached.value;
    } else {
      const token = await getSharePointAccessToken();
      explorer = await listFolderEntries(token, runtimeConfig.config.sharePoint, folderPath);
      explorerCache.set(cacheKey, {
        value: explorer,
        expiresAt: Date.now() + EXPLORER_CACHE_TTL_MS
      });
      if (explorerCache.size > 80) {
        pruneExplorerCache();
      }
    }

    return Response.json({
      ...explorer,
      files: (explorer.files ?? []).map((file) => ({
        ...file,
        openUrl: buildPublicMediaUrl(
          file.serverRelativeUrl,
          request.nextUrl.origin,
          buildAssetFingerprint(file)
        )
      })),
      baseFolder: runtimeConfig.config.sharePoint.baseFolder
    });
  } catch (error) {
    const normalized = normalizeOperationalError(
      error,
      "Errore durante la lettura dei contenuti SharePoint."
    );
    return Response.json(
      {
        error: normalized.message
      },
      {
        status: normalized.status
      }
    );
  }
}
