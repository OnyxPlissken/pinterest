import crypto from "node:crypto";
import path from "node:path";

import { getConfig } from "./config";

function normalizeMediaPath(serverRelativeUrl) {
  return String(serverRelativeUrl).trim();
}

function createSignature(serverRelativeUrl, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(normalizeMediaPath(serverRelativeUrl))
    .digest("base64url");
}

function normalizeOrigin(origin) {
  const candidate = String(origin || "").trim().replace(/\/+$/g, "");
  if (!candidate) {
    return "";
  }

  if (/^https?:\/\//i.test(candidate)) {
    return candidate;
  }

  if (candidate.startsWith("localhost") || candidate.startsWith("127.0.0.1")) {
    return `http://${candidate}`;
  }

  return `https://${candidate}`;
}

export function resolvePublicOrigin(origin = "") {
  const config = getConfig();
  const fallbackOrigin =
    config.app.publicOrigin ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3000";

  return normalizeOrigin(origin) || normalizeOrigin(fallbackOrigin);
}

export function signMediaPath(serverRelativeUrl) {
  const config = getConfig();
  return createSignature(serverRelativeUrl, config.app.mediaSigningSecret);
}

export function verifyMediaSignature(serverRelativeUrl, signature) {
  const expected = signMediaPath(serverRelativeUrl);
  const provided = String(signature || "").trim();

  if (!provided) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function buildPublicMediaUrl(serverRelativeUrl, origin = "") {
  const filename = path.posix.basename(normalizeMediaPath(serverRelativeUrl));
  const url = new URL(`/media/${encodeURIComponent(filename)}`, resolvePublicOrigin(origin));
  url.searchParams.set("path", normalizeMediaPath(serverRelativeUrl));
  url.searchParams.set("sig", signMediaPath(serverRelativeUrl));
  return url.toString();
}
