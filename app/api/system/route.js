import { NextResponse } from "next/server";

import { getAdminState } from "../../../lib/admin-store";
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

  const adminState = await getAdminState().catch(() => ({
    rules: [],
    settings: null,
    persistent: false,
    issue: "Storage amministrativo non disponibile.",
    storageLabel: "Storage non disponibile"
  }));
  const userStore = await listUsers().catch(() => ({
    users: [],
    persistent: false,
    issue: "Storage utenti non disponibile.",
    storageLabel: "Storage non disponibile"
  }));

  return NextResponse.json({
    auth: {
      mode: "login",
      currentUser: session,
      usersPersistent: userStore.persistent,
      usersIssue: userStore.issue || "",
      usersStorageLabel: userStore.storageLabel || "",
      protectedRoutes: [
        "/",
        "/api/explorer",
        "/api/preview",
        "/api/pinterest-admin",
        "/api/auth/pinterest/start",
        "/api/auth/pinterest/callback",
        "/api/generate",
        "/api/sync",
        "/api/system",
        "/api/rules",
        "/api/settings",
        "/api/settings/diagnostics"
      ],
      publicRoutes: ["/login", "/media", "/api/health"]
    },
    settings: {
      appName: adminState.settings?.appName || "Pinterest Assets Management",
      sharePointUrl: `https://${process.env.SHAREPOINT_HOSTNAME || "isaia.sharepoint.com"}${process.env.SHAREPOINT_SITE_PATH || "/sites/branding"}`,
      library: adminState.settings?.sharePoint?.driveName || "",
      baseFolder: adminState.settings?.sharePoint?.baseFolder || "",
      pinterestAppId: adminState.settings?.pinterest?.appId || "",
      pinterestAppSecretConfigured: Boolean(adminState.settings?.pinterest?.appSecret),
      pinterestAccessTokenConfigured: Boolean(
        adminState.settings?.pinterest?.accessTokenConfigured
      ),
      pinterestRefreshTokenConfigured: Boolean(
        adminState.settings?.pinterest?.refreshTokenConfigured
      ),
      titlePrefix: adminState.settings?.pinterest?.titlePrefix || "",
      descriptionPrefix: adminState.settings?.pinterest?.descriptionPrefix || "",
      linkUrl: adminState.settings?.pinterest?.linkUrl || "",
      thumbnailMode: adminState.settings?.pinterest?.thumbnailMode || "blank",
      defaultRuleId: adminState.settings?.defaultRuleId || "",
      mediaMode: "Proxy live da SharePoint, nessun Vercel Blob",
      pinterestApiReady: Boolean(adminState.settings?.pinterest?.accessTokenConfigured)
    },
    rules: adminState.rules,
    adminStore: {
      persistent: adminState.persistent,
      issue: adminState.issue || "",
      storageLabel: adminState.storageLabel || ""
    }
  });
}
