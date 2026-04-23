import { getRuntimeConfig } from "../../../lib/admin-store";
import { buildPublicMediaUrl } from "../../../lib/media-url";
import { normalizeOperationalError } from "../../../lib/operational-errors";
import { getSharePointAccessToken } from "../../../lib/sharepoint-auth";
import { listFolderEntries } from "../../../lib/sharepoint-client";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request) {
  try {
    const runtime = await getRuntimeConfig();
    const token = await getSharePointAccessToken();
    const subPath = request.nextUrl.searchParams.get("subPath") ?? "";
    const folderPath = subPath
      ? `${runtime.config.sharePoint.baseFolder}/${subPath}`
      : runtime.config.sharePoint.baseFolder;

    const explorer = await listFolderEntries(token, runtime.config.sharePoint, folderPath);

    return Response.json({
      ...explorer,
      files: (explorer.files ?? []).map((file) => ({
        ...file,
        openUrl: buildPublicMediaUrl(file.serverRelativeUrl, request.nextUrl.origin)
      })),
      baseFolder: runtime.config.sharePoint.baseFolder
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
