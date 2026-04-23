import { getRuntimeConfig } from "../../../lib/admin-store";
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
      baseFolder: runtime.config.sharePoint.baseFolder
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Errore durante la lettura di SharePoint."
      },
      {
        status: 500
      }
    );
  }
}
