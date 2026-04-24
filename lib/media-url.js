import crypto from "node:crypto";
import path from "node:path";

import { getConfig } from "./config";

function normalizeMediaPath(serverRelativeUrl) {
  return String(serverRelativeUrl).trim();
}

function normalizeVersion(versionHint = "") {
  return String(versionHint || "").trim();
}

function createSignature(serverRelativeUrl, versionHint, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(`${normalizeMediaPath(serverRelativeUrl)}|${normalizeVersion(versionHint)}`)
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

export function signMediaPath(serverRelativeUrl, versionHint = "") {
  const config = getConfig();
  return createSignature(serverRelativeUrl, versionHint, config.app.mediaSigningSecret);
}

export function verifyMediaSignature(serverRelativeUrl, signature, versionHint = "") {
  const expected = signMediaPath(serverRelativeUrl, versionHint);
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

export function buildPublicMediaUrl(serverRelativeUrl, origin = "", versionHint = "") {
  const filename = path.posix.basename(normalizeMediaPath(serverRelativeUrl));
  const url = new URL(`/media/${encodeURIComponent(filename)}`, resolvePublicOrigin(origin));
  url.searchParams.set("path", normalizeMediaPath(serverRelativeUrl));
  if (normalizeVersion(versionHint)) {
    url.searchParams.set("v", normalizeVersion(versionHint));
  }
  url.searchParams.set("sig", signMediaPath(serverRelativeUrl, versionHint));
  return url.toString();
}
