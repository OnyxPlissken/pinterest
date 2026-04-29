import crypto from "node:crypto";

import { getRuntimeConfig } from "../../../../../lib/admin-store";
import { getSessionFromRequest } from "../../../../../lib/session";

const PINTEREST_OAUTH_URL = "https://www.pinterest.com/oauth/";
const PINTEREST_SCOPES = [
  "user_accounts:read",
  "boards:read",
  "boards:write",
  "pins:read",
  "pins:write",
  "boards:read_secret",
  "boards:write_secret",
  "pins:read_secret",
  "pins:write_secret",
  "offline_access"
];

export const runtime = "nodejs";

export async function GET(request) {
  const session = await getSessionFromRequest(request);

  if (!session || session.role !== "admin") {
    return Response.json({ error: "Sessione amministratore non valida." }, { status: 401 });
  }

  const runtimeConfig = await getRuntimeConfig();
  const appId = runtimeConfig.config.pinterest.appId;

  if (!appId) {
    return Response.json({ error: "Configura Pinterest App ID prima di connettere OAuth." }, { status: 400 });
  }

  const state = crypto.randomBytes(16).toString("base64url");
  const redirectUri = `${request.nextUrl.origin}/api/auth/pinterest/callback`;
  const url = new URL(PINTEREST_OAUTH_URL);

  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", PINTEREST_SCOPES.join(","));
  url.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      "Set-Cookie": `pinterest_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`
    }
  });
}
