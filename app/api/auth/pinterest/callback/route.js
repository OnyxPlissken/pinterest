import { Buffer } from "node:buffer";

import {
  getRuntimeConfig,
  updatePinterestAccessToken
} from "../../../../../lib/admin-store";
import { getSessionFromRequest } from "../../../../../lib/session";

export const runtime = "nodejs";

function readCookie(request, name) {
  const cookie = request.headers.get("cookie") || "";
  return cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1) || "";
}

export async function GET(request) {
  const session = await getSessionFromRequest(request);

  if (!session || session.role !== "admin") {
    return Response.json({ error: "Sessione amministratore non valida." }, { status: 401 });
  }

  const code = request.nextUrl.searchParams.get("code") || "";
  const state = request.nextUrl.searchParams.get("state") || "";
  const expectedState = readCookie(request, "pinterest_oauth_state");

  if (!code) {
    return Response.json({ error: "Pinterest non ha restituito il codice OAuth." }, { status: 400 });
  }

  if (!state || !expectedState || state !== expectedState) {
    return Response.json({ error: "Stato OAuth Pinterest non valido." }, { status: 400 });
  }

  const runtimeConfig = await getRuntimeConfig();
  const { appId, appSecret } = runtimeConfig.config.pinterest;

  if (!appId || !appSecret) {
    return Response.json(
      { error: "Configura Pinterest App ID e App Secret prima di completare OAuth." },
      { status: 400 }
    );
  }

  const redirectUri = `${request.nextUrl.origin}/api/auth/pinterest/callback`;
  const response = await fetch("https://api.pinterest.com/v5/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${appId}:${appSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri
    })
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.access_token) {
    return Response.json(
      {
        error:
          payload.message ||
          payload.error_description ||
          payload.error ||
          "Scambio OAuth Pinterest non riuscito."
      },
      { status: 400 }
    );
  }

  await updatePinterestAccessToken(payload.access_token);

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/?view=pinterest",
      "Set-Cookie": "pinterest_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
    }
  });
}
