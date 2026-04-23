import crypto from "node:crypto";
import { promisify } from "node:util";

import { del, list, put } from "@vercel/blob";

const scryptAsync = promisify(crypto.scrypt);
const USERS_STORE_PATH = "internal/users.store";

function getStorageToken() {
  return String(process.env.BLOB_READ_WRITE_TOKEN || "").trim();
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
    throw new Error("Serve AUTH_SECRET o un segreto equivalente per proteggere gli utenti.");
  }

  return candidate.trim();
}

function deriveKey() {
  return crypto.createHash("sha256").update(getStoreSecret()).digest();
}

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    active: Boolean(user.active),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt || null
  };
}

function buildEmptyStore() {
  return {
    version: 1,
    users: []
  };
}

function getStorageIssueMessage(error) {
  const rawMessage =
    error instanceof Error ? error.message : String(error || "Storage utenti non disponibile.");

  if (/suspended/i.test(rawMessage)) {
    return "Vercel Blob non disponibile: store sospeso.";
  }

  if (/blob/i.test(rawMessage)) {
    return `Vercel Blob non disponibile: ${rawMessage}`;
  }

  return rawMessage;
}

function getBootstrapCredentials() {
  const username = normalizeUsername(
    process.env.AUTH_BOOTSTRAP_USERNAME || process.env.BASIC_AUTH_USERNAME
  );
  const password = String(
    process.env.AUTH_BOOTSTRAP_PASSWORD || process.env.BASIC_AUTH_PASSWORD || ""
  ).trim();

  if (!username || !password) {
    return null;
  }

  return {
    username,
    password,
    displayName: "Amministratore",
    role: "admin",
    active: true
  };
}

async function hashPassword(password) {
  const normalized = String(password || "");
  const salt = crypto.randomBytes(16);
  const derivedKey = await scryptAsync(normalized, salt, 64);
  return `scrypt:${salt.toString("base64url")}:${Buffer.from(derivedKey).toString("base64url")}`;
}

async function verifyPassword(password, storedHash) {
  const [algorithm, saltValue, hashValue] = String(storedHash || "").split(":");

  if (algorithm !== "scrypt" || !saltValue || !hashValue) {
    return false;
  }

  const derivedKey = await scryptAsync(String(password || ""), Buffer.from(saltValue, "base64url"), 64);
  const expected = Buffer.from(hashValue, "base64url");
  const actual = Buffer.from(derivedKey);

  try {
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function encryptStore(document) {
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

function decryptStore(serialized) {
  const envelope = JSON.parse(String(serialized || "{}"));

  if (!envelope.iv || !envelope.tag || !envelope.ciphertext) {
    return buildEmptyStore();
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

async function findBlobRecord() {
  const token = getStorageToken();

  if (!token) {
    return null;
  }

  const { blobs } = await list({
    token,
    prefix: USERS_STORE_PATH,
    limit: 20
  });

  return blobs.find((blob) => blob.pathname === USERS_STORE_PATH) || blobs[0] || null;
}

async function readPersistedStore() {
  const blobRecord = await findBlobRecord();

  if (!blobRecord) {
    return null;
  }

  const response = await fetch(blobRecord.url, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Impossibile leggere lo store utenti.");
  }

  return decryptStore(await response.text());
}

async function writePersistedStore(store) {
  const token = getStorageToken();

  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN mancante: gestione utenti non persistente.");
  }

  const existingBlob = await findBlobRecord();
  if (existingBlob) {
    await del(existingBlob.url, { token });
  }

  await put(USERS_STORE_PATH, encryptStore(store), {
    token,
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json"
  });
}

async function createBootstrapUser(credentials) {
  const now = new Date().toISOString();

  return {
    id: `bootstrap-${credentials.username}`,
    username: credentials.username,
    displayName: credentials.displayName,
    role: credentials.role,
    active: credentials.active,
    passwordHash: await hashPassword(credentials.password),
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null
  };
}

async function buildBootstrapStoreResult(issue = "") {
  const bootstrap = getBootstrapCredentials();

  if (!bootstrap) {
    return {
      store: buildEmptyStore(),
      persistent: false,
      issue
    };
  }

  return {
    store: {
      version: 1,
      users: [await createBootstrapUser(bootstrap)]
    },
    persistent: false,
    issue
  };
}

async function ensureBootstrapStore(store) {
  if (store.users.length > 0) {
    return store;
  }

  const bootstrap = getBootstrapCredentials();
  if (!bootstrap) {
    return store;
  }

  return {
    ...store,
    users: [await createBootstrapUser(bootstrap)]
  };
}

async function loadStore() {
  const token = getStorageToken();

  if (!token) {
    return buildBootstrapStoreResult("Storage utenti non configurato.");
  }

  try {
    const persistedStore = (await readPersistedStore()) || buildEmptyStore();
    const normalizedStore = await ensureBootstrapStore(persistedStore);

    if (!persistedStore.users?.length && normalizedStore.users.length) {
      await writePersistedStore(normalizedStore);
    }

    return {
      store: normalizedStore,
      persistent: true,
      issue: ""
    };
  } catch (error) {
    return buildBootstrapStoreResult(getStorageIssueMessage(error));
  }
}

async function saveStore(store, persistent, issue = "") {
  if (!persistent) {
    throw new Error(issue || "Storage utenti non configurato in modo persistente.");
  }

  await writePersistedStore(store);
}

export async function authenticateUser(username, password) {
  const normalizedUsername = normalizeUsername(username);
  const { store } = await loadStore();
  const user = store.users.find((entry) => entry.username === normalizedUsername);

  if (!user || !user.active) {
    return null;
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    return null;
  }

  return sanitizeUser(user);
}

export async function touchUserLastLogin(userId) {
  const { store, persistent, issue } = await loadStore();

  if (!persistent) {
    return;
  }

  const now = new Date().toISOString();
  const nextUsers = store.users.map((user) =>
    user.id === userId
      ? {
          ...user,
          lastLoginAt: now,
          updatedAt: now
        }
      : user
  );

  await saveStore({ ...store, users: nextUsers }, persistent, issue);
}

export async function listUsers() {
  const { store, persistent, issue } = await loadStore();

  return {
    users: [...store.users]
      .sort((left, right) => left.username.localeCompare(right.username, "it"))
      .map(sanitizeUser),
    persistent,
    issue
  };
}

export async function createUser(input) {
  const username = normalizeUsername(input.username);
  const displayName = String(input.displayName || "").trim();
  const password = String(input.password || "");
  const role = input.role === "admin" ? "admin" : "editor";
  const active = input.active !== false;

  if (!username || !displayName || !password) {
    throw new Error("Compila username, nome e password del nuovo utente.");
  }

  const { store, persistent, issue } = await loadStore();
  const alreadyExists = store.users.some((user) => user.username === username);

  if (alreadyExists) {
    throw new Error("Esiste gia un utente con questo username.");
  }

  const now = new Date().toISOString();
  const nextUser = {
    id: crypto.randomUUID(),
    username,
    displayName,
    role,
    active,
    passwordHash: await hashPassword(password),
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null
  };

  await saveStore(
    {
      ...store,
      users: [...store.users, nextUser]
    },
    persistent,
    issue
  );

  return sanitizeUser(nextUser);
}

export async function updateUser(userId, updates) {
  const { store, persistent, issue } = await loadStore();
  const user = store.users.find((entry) => entry.id === userId);

  if (!user) {
    throw new Error("Utente non trovato.");
  }

  const nextDisplayName = String(updates.displayName || "").trim();
  const nextRole = updates.role === "admin" ? "admin" : "editor";
  const nextActive = updates.active !== false;
  const nextPassword = String(updates.password || "");

  if (!nextDisplayName) {
    throw new Error("Il nome utente visibile non puo essere vuoto.");
  }

  const nextUser = {
    ...user,
    displayName: nextDisplayName,
    role: nextRole,
    active: nextActive,
    updatedAt: new Date().toISOString()
  };

  if (nextPassword) {
    nextUser.passwordHash = await hashPassword(nextPassword);
  }

  const nextUsers = store.users.map((entry) => (entry.id === userId ? nextUser : entry));
  const activeAdmins = nextUsers.filter((entry) => entry.role === "admin" && entry.active);

  if (!activeAdmins.length) {
    throw new Error("Deve restare almeno un amministratore attivo.");
  }

  await saveStore(
    {
      ...store,
      users: nextUsers
    },
    persistent,
    issue
  );

  return sanitizeUser(nextUser);
}
