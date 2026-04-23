import { NextResponse } from "next/server";

import { getConfig } from "../../../lib/config";
import { getSessionFromRequest } from "../../../lib/session";
import { listUsers } from "../../../lib/user-store";

export const runtime = "nodejs";

export async function GET(request) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      {
        error: "Sessione non valida."
      },
      {
        status: 401
      }
    );
  }

  const config = getConfig();
  const userStore = await listUsers().catch(() => ({
    users: [],
    persistent: false
  }));

  return NextResponse.json({
    auth: {
      mode: "login",
      currentUser: session,
      usersPersistent: userStore.persistent,
      usersIssue: userStore.issue || "",
      protectedRoutes: ["/", "/api/explorer", "/api/preview", "/api/generate", "/api/system"],
      publicRoutes: ["/login", "/media", "/api/health"]
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
