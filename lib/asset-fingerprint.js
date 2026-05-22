import crypto from "node:crypto";

function hashParts(parts) {
  return crypto.createHash("sha1").update(parts.join("|")).digest("base64url");
}

function normalizeIsoDate(value) {
  const candidate = String(value || "").trim();
  return candidate || "unknown";
}

function normalizeSize(value) {
  const size = Number(value);
  return Number.isFinite(size) ? String(size) : "0";
}

function normalizeUniqueId(value) {
  return String(value || "").trim() || "unknown";
}

export function buildAssetFingerprint(file = {}) {
  const source = [
    normalizeUniqueId(file.uniqueId),
    normalizeSize(file.size),
    normalizeIsoDate(file.modifiedAt)
  ];

  return hashParts(source);
}

export function buildAssetLocationFingerprint(file = {}) {
  return hashParts([
    String(file.serverRelativeUrl || "").trim(),
    String(file.relativePath || "").trim(),
    String(file.name || "").trim()
  ]);
}

export function buildContentHash(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("base64url");
}
