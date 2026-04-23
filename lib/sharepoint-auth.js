import crypto from "node:crypto";
import { importPKCS8, SignJWT } from "jose";

import { getConfig } from "./config";

function toBase64UrlFromHex(hexString) {
  return Buffer.from(hexString, "hex").toString("base64url");
}

function toPkcs8Pem(privateKeyPem) {
  const normalizedKey = privateKeyPem.trim();

  if (normalizedKey.includes("BEGIN PRIVATE KEY")) {
    return normalizedKey;
  }

  const privateKeyObject = crypto.createPrivateKey({
    key: normalizedKey,
    format: "pem"
  });

  return privateKeyObject.export({
    format: "pem",
    type: "pkcs8"
  }).toString();
}

export async function getGraphAccessToken() {
  const { sharePoint } = getConfig();
  const audience = `https://login.microsoftonline.com/${sharePoint.tenantId}/oauth2/v2.0/token`;
  let body;

  if (sharePoint.authMode === "client-secret") {
    body = new URLSearchParams({
      client_id: sharePoint.clientId,
      client_secret: sharePoint.clientSecret,
      grant_type: "client_credentials",
      scope: "https://graph.microsoft.com/.default"
    });
  } else {
    const now = Math.floor(Date.now() / 1000);
    const pkcs8PrivateKey = toPkcs8Pem(sharePoint.privateKey);
    const signingKey = await importPKCS8(pkcs8PrivateKey, "RS256");
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

    body = new URLSearchParams({
      client_id: sharePoint.clientId,
      grant_type: "client_credentials",
      scope: "https://graph.microsoft.com/.default",
      client_assertion_type:
        "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_assertion: clientAssertion
    });
  }

  const response = await fetch(audience, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.access_token) {
    throw new Error(
      `Autenticazione Microsoft Graph fallita (${response.status}): ${payload.error_description ?? payload.error ?? "errore sconosciuto"}`
    );
  }

  return payload.access_token;
}
