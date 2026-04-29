import { getRuntimeConfig } from "../../../../lib/admin-store";
import { getSessionFromRequest } from "../../../../lib/session";

export const runtime = "nodejs";

function maskSecret(value) {
  const text = String(value || "");
  if (!text) {
    return {
      configured: false,
      length: 0,
      preview: ""
    };
  }

  return {
    configured: true,
    length: text.length,
    preview: `${text.slice(0, 4)}...${text.slice(-4)}`
  };
}

export async function GET(request) {
  const session = await getSessionFromRequest(request);

  if (!session || session.role !== "admin") {
    return Response.json({ error: "Sessione amministratore non valida." }, { status: 401 });
  }

  const runtime = await getRuntimeConfig();
  const pinterest = runtime.config.pinterest;

  return Response.json({
    persistent: runtime.persistent,
    storageLabel: runtime.storageLabel,
    issue: runtime.issue || "",
    pinterest: {
      appId: pinterest.appId,
      appSecret: maskSecret(pinterest.appSecret),
      accessToken: maskSecret(pinterest.accessToken),
      refreshToken: maskSecret(pinterest.refreshToken),
      linkUrl: pinterest.linkUrl,
      linkIsBlank: !pinterest.linkUrl
    }
  });
}
