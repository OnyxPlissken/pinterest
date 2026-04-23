import crypto from "node:crypto";

import { getConfig } from "./config";
import { getSharePointAccessToken } from "./sharepoint-auth";
import { readTextFile, writeTextFile } from "./sharepoint-client";

const STORAGE_ROOT = "__PinterestAssetsManagement";

function getStorageRoot() {
  return String(process.env.APP_STORAGE_FOLDER || STORAGE_ROOT)
    .trim()
    .replace(/^\/+|\/+$/g, "");
}

function getStoreSecret() {
  const candidate =
    process.env.AUTH_SECRET ||
    process.env.MEDIA_SIGNING_SECRET ||
    process.env.SHAREPOINT_CLIENT_SECRET ||
    process.env.SHAREPOINT_PRIVATE_KEY_BASE64 ||
    process.env.SHAREPOINT_PRIVATE_KEY ||
    process.env.BASIC_AUTH_PASSWORD;

  if (!candidate) {
    throw new Error("Serve AUTH_SECRET o un segreto equivalente per proteggere lo storage.");
  }

  return candidate.trim();
}

function deriveKey() {
  return crypto.createHash("sha256").update(getStoreSecret()).digest();
}

function encryptDocument(document) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", deriveKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(document), "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return JSON.stringify({
    version: 1,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64url"),
    tag: tag.toString("base64url"),
    ciphertext: encrypted.toString("base64url")
  });
}

function decryptDocument(serialized, fallbackFactory) {
  if (!serialized) {
    return fallbackFactory();
  }

  const envelope = JSON.parse(String(serialized || "{}"));
  if (!envelope.iv || !envelope.tag || !envelope.ciphertext) {
    return fallbackFactory();
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    deriveKey(),
    Buffer.from(envelope.iv, "base64url")
  );
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64url")),
    decipher.final()
  ]);

  return JSON.parse(decrypted.toString("utf8"));
}

export function getPersistentStorageLabel(persistent, issue = "") {
  return persistent ? "SharePoint cifrato" : issue || "Storage non disponibile";
}

export function getStorageIssueMessage(error) {
  const rawMessage =
    error instanceof Error ? error.message : String(error || "Storage SharePoint non disponibile.");

  if (/401|403/.test(rawMessage)) {
    return "Storage SharePoint non autorizzato.";
  }

  return rawMessage;
}

async function resolveStorageContext() {
  const config = getConfig();
  const token = await getSharePointAccessToken();

  return {
    token,
    sharePoint: config.sharePoint,
    root: getStorageRoot()
  };
}

function buildFilePath(root, filename) {
  return `${root}/${String(filename || "").replace(/^\/+|\/+$/g, "")}`;
}

export async function loadEncryptedDocument(filename, fallbackFactory) {
  try {
    const context = await resolveStorageContext();
    const filePath = buildFilePath(context.root, filename);
    const serialized = await readTextFile(context.token, context.sharePoint, filePath);
    const document = decryptDocument(serialized, fallbackFactory);

    if (!serialized) {
      await writeTextFile(
        context.token,
        context.sharePoint,
        filePath,
        encryptDocument(document)
      );
    }

    return {
      document,
      persistent: true,
      issue: "",
      storageLabel: getPersistentStorageLabel(true)
    };
  } catch (error) {
    return {
      document: fallbackFactory(),
      persistent: false,
      issue: getStorageIssueMessage(error),
      storageLabel: getPersistentStorageLabel(false, getStorageIssueMessage(error))
    };
  }
}

export async function saveEncryptedDocument(filename, document) {
  const context = await resolveStorageContext();
  const filePath = buildFilePath(context.root, filename);

  await writeTextFile(
    context.token,
    context.sharePoint,
    filePath,
    encryptDocument(document)
  );

  return {
    persistent: true,
    issue: "",
    storageLabel: getPersistentStorageLabel(true)
  };
}
