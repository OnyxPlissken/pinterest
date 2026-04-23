import crypto from "node:crypto";
import { promisify } from "node:util";

import {
  getStorageIssueMessage,
  getPersistentStorageLabel,
  loadEncryptedDocument,
  saveEncryptedDocument
} from "./persistent-store";

const scryptAsync = promisify(crypto.scrypt);
const USERS_STORE_FILE = "users.store";

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
  const payload = await loadEncryptedDocument(USERS_STORE_FILE, buildEmptyStore);
  const normalizedStore = await ensureBootstrapStore(payload.document);

  if (
    payload.persistent &&
    JSON.stringify(normalizedStore) !== JSON.stringify(payload.document)
  ) {
    await saveEncryptedDocument(USERS_STORE_FILE, normalizedStore);
  }

  return {
    store: normalizedStore,
    persistent: payload.persistent,
    issue: payload.issue,
    storageLabel: payload.storageLabel
  };
}

async function saveStore(store, persistent, issue = "") {
  if (!persistent) {
    throw new Error(issue || "Storage utenti non configurato in modo persistente.");
  }

  try {
    await saveEncryptedDocument(USERS_STORE_FILE, store);
  } catch (error) {
    throw new Error(getStorageIssueMessage(error));
  }
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
  const { store, persistent, issue, storageLabel } = await loadStore();

  return {
    users: [...store.users]
      .sort((left, right) => left.username.localeCompare(right.username, "it"))
      .map(sanitizeUser),
    persistent,
    issue,
    storageLabel: persistent ? storageLabel : getPersistentStorageLabel(false, issue)
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
