import { getConfig } from "../../../lib/config";

export const runtime = "nodejs";

export async function GET() {
  const config = getConfig();

  return Response.json({
    basicAuth: {
      enabled: Boolean(process.env.BASIC_AUTH_USERNAME && process.env.BASIC_AUTH_PASSWORD),
      username: process.env.BASIC_AUTH_USERNAME || "",
      protectedRoutes: ["/", "/api/explorer", "/api/preview", "/api/generate", "/api/system"],
      publicRoutes: ["/media", "/api/health"]
    },
    settings: {
      sharePointUrl: `https://${config.sharePoint.hostname}${config.sharePoint.sitePath}`,
      library: config.sharePoint.driveName,
      baseFolder: config.sharePoint.baseFolder,
      titlePrefix: config.pinterest.titlePrefix,
      descriptionPrefix: config.pinterest.descriptionPrefix,
      linkUrl: config.pinterest.linkUrl,
      thumbnailMode: config.pinterest.thumbnailMode,
      mediaMode: "Proxy live da SharePoint, nessun Vercel Blob"
    }
  });
}
