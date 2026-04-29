import {
  getStorageIssueMessage,
  loadEncryptedDocument,
  saveEncryptedDocument
} from "./persistent-store";

const SYNC_STORE_FILE = "pinterest-sync.store";

function buildEmptySyncStore() {
  return {
    version: 1,
    pins: {},
    runs: []
  };
}

function normalizeSyncStore(document) {
  return {
    version: 1,
    pins: document?.pins && typeof document.pins === "object" ? document.pins : {},
    runs: Array.isArray(document?.runs) ? document.runs.slice(0, 25) : []
  };
}

export async function loadPinterestSyncStore() {
  const payload = await loadEncryptedDocument(SYNC_STORE_FILE, buildEmptySyncStore);
  const store = normalizeSyncStore(payload.document);

  if (payload.persistent && JSON.stringify(store) !== JSON.stringify(payload.document)) {
    await saveEncryptedDocument(SYNC_STORE_FILE, store);
  }

  return {
    store,
    persistent: payload.persistent,
    issue: payload.issue,
    storageLabel: payload.storageLabel
  };
}

export async function savePinterestSyncStore(store, persistent, issue = "") {
  if (!persistent) {
    throw new Error(issue || "Storage sync Pinterest non configurato in modo persistente.");
  }

  try {
    await saveEncryptedDocument(SYNC_STORE_FILE, normalizeSyncStore(store));
  } catch (error) {
    throw new Error(getStorageIssueMessage(error));
  }
}
