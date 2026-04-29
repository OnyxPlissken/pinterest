import { Buffer } from "node:buffer";

import {
  getRuntimeConfig,
  updatePinterestAccessToken
} from "../../../../../lib/admin-store";
import { getSessionFromRequest } from "../../../../../lib/session";

export const runtime = "nodejs";

async function exchangePinterestCode({ appId, appSecret, code, redirectUri, useBasicAuth }) {
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json"
  };
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri
  });

  if (useBasicAuth) {
    headers.Authorization = `Basic ${Buffer.from(`${appId}:${appSecret}`).toString("base64")}`;
  } else {
    body.set("client_id", appId);
    body.set("client_secret", appSecret);
  }

  const response = await fetch("https://api.pinterest.com/v5/oauth/token", {
    method: "POST",
    headers,
    body
  });
  const payload = await response.json().catch(() => ({}));

  return {
    ok: response.ok,
    status: response.status,
    payload
  };
}

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
  const exchanges = [
    await exchangePinterestCode({
      appId,
      appSecret,
      code,
      redirectUri,
      useBasicAuth: true
    })
  ];

  if (!exchanges[0].ok) {
    exchanges.push(
      await exchangePinterestCode({
        appId,
        appSecret,
        code,
        redirectUri,
        useBasicAuth: false
      })
    );
  }

  const success = exchanges.find((exchange) => exchange.ok && exchange.payload.access_token);
  const failure = exchanges.at(-1);

  if (!success) {
    const payload = failure?.payload || {};
    const rawMessage =
      payload.message ||
      payload.error_description ||
      payload.error ||
      "Scambio OAuth Pinterest non riuscito.";
    return Response.json(
      {
        error:
          rawMessage === "Authentication failed."
            ? "Pinterest ha rifiutato App ID/App Secret durante lo scambio OAuth. Verifica nelle impostazioni che App ID e App Secret siano quelli dell'app Pinterest e che il Redirect URI sia https://pinterest-steel.vercel.app/api/auth/pinterest/callback."
            : rawMessage
      },
      { status: 400 }
    );
  }

  await updatePinterestAccessToken(success.payload.access_token);

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/?view=pinterest",
      "Set-Cookie": "pinterest_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
    }
  });
}
