import crypto from "node:crypto";

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
    String(file.serverRelativeUrl || "").trim(),
    normalizeUniqueId(file.uniqueId),
    normalizeSize(file.size),
    normalizeIsoDate(file.modifiedAt)
  ].join("|");

  return crypto.createHash("sha1").update(source).digest("base64url");
}
