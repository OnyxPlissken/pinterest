import crypto from "node:crypto";
import { importPKCS8, SignJWT } from "jose";

import { getConfig } from "./config";

function toBase64UrlFromHex(hexString) {
  return Buffer.from(hexString, "hex").toString("base64url");
}

export async function getGraphAccessToken() {
  const { sharePoint } = getConfig();
  const now = Math.floor(Date.now() / 1000);
  const audience = `https://login.microsoftonline.com/${sharePoint.tenantId}/oauth2/v2.0/token`;
  const signingKey = await importPKCS8(sharePoint.privateKey, "RS256");

  const clientAssertion = await new SignJWT({})
    .setProtectedHeader({
      alg: "RS256",
      typ: "JWT",
      x5t: toBase64UrlFromHex(sharePoint.thumbprint)
    })
    .setIssuer(sharePoint.clientId)
    .setSubject(sharePoint.clientId)
    .setAudience(audience)
    .setJti(crypto.randomUUID())
    .setIssuedAt(now)
    .setNotBefore(now - 10)
    .setExpirationTime(now + 300)
    .sign(signingKey);

  const response = await fetch(audience, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: sharePoint.clientId,
      grant_type: "client_credentials",
      scope: "https://graph.microsoft.com/.default",
      client_assertion_type:
        "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_assertion: clientAssertion
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.access_token) {
    throw new Error(
      `Autenticazione Microsoft Graph fallita (${response.status}): ${payload.error_description ?? payload.error ?? "errore sconosciuto"}`
    );
  }

  return payload.access_token;
}
