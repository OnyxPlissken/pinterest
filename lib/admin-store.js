import crypto from "node:crypto";

import { getConfig } from "./config";
import { buildRulePreview } from "./pinterest-format";
import {
  getStorageIssueMessage,
  getPersistentStorageLabel,
  loadEncryptedDocument,
  saveEncryptedDocument
} from "./persistent-store";

const RULES_STORE_FILE = "rules.store";
const SETTINGS_STORE_FILE = "settings.store";

function normalizeText(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function normalizeThumbnailMode(value, fallback = "blank") {
  return value === "level5" ? "level5" : fallback;
}

function buildDefaultRule(config) {
  const now = new Date().toISOString();

  return {
    id: "regola-standard",
    name: "Standard",
    titlePrefix: config.pinterest.titlePrefix,
    descriptionPrefix: config.pinterest.descriptionPrefix,
    linkUrl: config.pinterest.linkUrl,
    thumbnailMode: config.pinterest.thumbnailMode,
    active: true,
    createdAt: now,
    updatedAt: now,
    usageDescription: ""
  };
}

function hasOwn(source, key) {
  return Boolean(source) && Object.prototype.hasOwnProperty.call(source, key);
}

function buildDefaultSettings(config, defaultRuleId) {
  return {
    version: 1,
    appName: "Pinterest Assets Management",
    defaultRuleId,
    sharePoint: {
      driveName: config.sharePoint.driveName,
      baseFolder: config.sharePoint.baseFolder
    },
    pinterest: {
      appId: config.pinterest.appId,
      appSecret: config.pinterest.appSecret,
      accessToken: config.pinterest.accessToken,
      titlePrefix: config.pinterest.titlePrefix,
      descriptionPrefix: config.pinterest.descriptionPrefix,
      linkUrl: config.pinterest.linkUrl,
      thumbnailMode: config.pinterest.thumbnailMode
    }
  };
}

function sanitizeRule(rule, defaultRuleId = "") {
  const preview = buildRulePreview({
    titlePrefix: rule.titlePrefix,
    descriptionPrefix: rule.descriptionPrefix
  });

  return {
    id: rule.id,
    name: rule.name,
    titlePrefix: rule.titlePrefix,
    descriptionPrefix: rule.descriptionPrefix,
    linkUrl: rule.linkUrl,
    thumbnailMode: rule.thumbnailMode,
    active: Boolean(rule.active),
    isDefault: rule.id === defaultRuleId,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
    usageDescription: rule.usageDescription || "",
    notes: rule.usageDescription || "",
    previewTitle: preview.title,
    previewDescription: preview.description,
    previewSection: preview.section
  };
}

function sanitizeSettings(settings) {
  return {
    appName: settings.appName,
    defaultRuleId: settings.defaultRuleId,
    sharePoint: {
      driveName: settings.sharePoint.driveName,
      baseFolder: settings.sharePoint.baseFolder
    },
    pinterest: {
      appId: settings.pinterest.appId,
      appSecretConfigured: Boolean(settings.pinterest.appSecret),
      accessTokenConfigured: Boolean(settings.pinterest.accessToken),
      titlePrefix: settings.pinterest.titlePrefix,
      descriptionPrefix: settings.pinterest.descriptionPrefix,
      linkUrl: settings.pinterest.linkUrl,
      thumbnailMode: settings.pinterest.thumbnailMode
    }
  };
}

function buildEmptyRulesStore(config) {
  return {
    version: 1,
    rules: [buildDefaultRule(config)]
  };
}

function normalizeRule(rule, fallbackRule) {
  return {
    id: normalizeText(rule?.id) || crypto.randomUUID(),
    name: normalizeText(rule?.name) || fallbackRule.name,
    titlePrefix: normalizeText(rule?.titlePrefix) || fallbackRule.titlePrefix,
    descriptionPrefix:
      normalizeText(rule?.descriptionPrefix) || fallbackRule.descriptionPrefix,
    linkUrl: hasOwn(rule, "linkUrl") ? normalizeText(rule.linkUrl) : fallbackRule.linkUrl,
    thumbnailMode: normalizeThumbnailMode(rule?.thumbnailMode, fallbackRule.thumbnailMode),
    active: rule?.active !== false,
    createdAt: normalizeText(rule?.createdAt) || new Date().toISOString(),
    updatedAt: normalizeText(rule?.updatedAt) || new Date().toISOString(),
    usageDescription: normalizeText(rule?.usageDescription ?? rule?.notes)
  };
}

async function loadRulesStore() {
  const config = getConfig();
  const fallbackStore = buildEmptyRulesStore(config);
  const payload = await loadEncryptedDocument(RULES_STORE_FILE, () => fallbackStore);
  const defaultRule = buildDefaultRule(config);
  const incomingRules = Array.isArray(payload.document.rules) ? payload.document.rules : [];
  const normalizedRules = incomingRules.length
    ? incomingRules.map((rule) => normalizeRule(rule, defaultRule))
    : [defaultRule];
  const nextStore = {
    version: 1,
    rules: normalizedRules
  };

  if (
    payload.persistent &&
    JSON.stringify(nextStore) !== JSON.stringify(payload.document)
  ) {
    await saveEncryptedDocument(RULES_STORE_FILE, nextStore);
  }

  return {
    store: nextStore,
    persistent: payload.persistent,
    issue: payload.issue,
    storageLabel: payload.storageLabel
  };
}

async function saveRulesStore(store, persistent, issue = "") {
  if (!persistent) {
    throw new Error(issue || "Storage regole non configurato in modo persistente.");
  }

  try {
    await saveEncryptedDocument(RULES_STORE_FILE, store);
  } catch (error) {
    throw new Error(getStorageIssueMessage(error));
  }
}

async function loadSettingsStore(rulesStore) {
  const config = getConfig();
  const defaultSettings = buildDefaultSettings(
    config,
    rulesStore.store.rules[0]?.id || buildDefaultRule(config).id
  );
  const payload = await loadEncryptedDocument(SETTINGS_STORE_FILE, () => defaultSettings);
  const activeRuleIds = new Set(rulesStore.store.rules.filter((rule) => rule.active).map((rule) => rule.id));
  const fallbackRuleId =
    rulesStore.store.rules.find((rule) => rule.id === defaultSettings.defaultRuleId)?.id ||
    rulesStore.store.rules[0]?.id ||
    "";

  const nextSettings = {
    version: 1,
    appName: normalizeText(payload.document.appName) || defaultSettings.appName,
    defaultRuleId: activeRuleIds.has(payload.document.defaultRuleId)
      ? payload.document.defaultRuleId
      : fallbackRuleId,
    sharePoint: {
      driveName:
        normalizeText(payload.document.sharePoint?.driveName) ||
        defaultSettings.sharePoint.driveName,
      baseFolder:
        normalizeText(payload.document.sharePoint?.baseFolder) ||
        defaultSettings.sharePoint.baseFolder
    },
    pinterest: {
      appId:
        normalizeText(payload.document.pinterest?.appId) ||
        defaultSettings.pinterest.appId,
      appSecret:
        normalizeText(payload.document.pinterest?.appSecret) ||
        defaultSettings.pinterest.appSecret,
      accessToken:
        normalizeText(payload.document.pinterest?.accessToken) ||
        defaultSettings.pinterest.accessToken,
      titlePrefix:
        normalizeText(payload.document.pinterest?.titlePrefix) ||
        defaultSettings.pinterest.titlePrefix,
      descriptionPrefix:
        normalizeText(payload.document.pinterest?.descriptionPrefix) ||
        defaultSettings.pinterest.descriptionPrefix,
      linkUrl:
        normalizeText(payload.document.pinterest?.linkUrl) ||
        defaultSettings.pinterest.linkUrl,
      thumbnailMode: normalizeThumbnailMode(
        payload.document.pinterest?.thumbnailMode,
        defaultSettings.pinterest.thumbnailMode
      )
    }
  };

  if (
    payload.persistent &&
    JSON.stringify(nextSettings) !== JSON.stringify(payload.document)
  ) {
    await saveEncryptedDocument(SETTINGS_STORE_FILE, nextSettings);
  }

  return {
    settings: nextSettings,
    persistent: payload.persistent,
    issue: payload.issue,
    storageLabel: payload.storageLabel
  };
}

async function saveSettingsStore(settings, persistent, issue = "") {
  if (!persistent) {
    throw new Error(issue || "Storage impostazioni non configurato in modo persistente.");
  }

  try {
    await saveEncryptedDocument(SETTINGS_STORE_FILE, settings);
  } catch (error) {
    throw new Error(getStorageIssueMessage(error));
  }
}

export async function getAdminState() {
  const rulesStore = await loadRulesStore();
  const settingsStore = await loadSettingsStore(rulesStore);
  const rules = rulesStore.store.rules.map((rule) =>
    sanitizeRule(rule, settingsStore.settings.defaultRuleId)
  );

  return {
    rules,
    settings: sanitizeSettings(settingsStore.settings),
    persistent: rulesStore.persistent && settingsStore.persistent,
    issue: rulesStore.issue || settingsStore.issue || "",
    storageLabel:
      rulesStore.persistent && settingsStore.persistent
        ? getPersistentStorageLabel(true)
        : getPersistentStorageLabel(false, rulesStore.issue || settingsStore.issue || "")
  };
}

export async function createRule(input) {
  const rulesStore = await loadRulesStore();
  const settingsStore = await loadSettingsStore(rulesStore);
  const name = normalizeText(input.name);
  if (!name) {
    throw new Error("Inserisci un nome per la regola.");
  }

  const now = new Date().toISOString();
  const nextRule = {
    id: crypto.randomUUID(),
    name,
    titlePrefix: normalizeText(input.titlePrefix),
    descriptionPrefix: normalizeText(input.descriptionPrefix),
    linkUrl: normalizeText(input.linkUrl),
    thumbnailMode: normalizeThumbnailMode(input.thumbnailMode),
    active: input.active !== false,
    createdAt: now,
    updatedAt: now,
    usageDescription: normalizeText(input.usageDescription ?? input.notes)
  };

  if (!nextRule.titlePrefix || !nextRule.descriptionPrefix) {
    throw new Error("Compila nome, titolo e descrizione fissa della regola.");
  }

  if (input.isDefault === true && !nextRule.active) {
    throw new Error("Una regola predefinita deve restare attiva.");
  }

  const nextStore = {
    ...rulesStore.store,
    rules: [...rulesStore.store.rules, nextRule]
  };

  await saveRulesStore(
    nextStore,
    rulesStore.persistent,
    rulesStore.issue
  );

  if (input.isDefault === true && nextRule.active) {
    await saveSettingsStore(
      {
        ...settingsStore.settings,
        defaultRuleId: nextRule.id
      },
      settingsStore.persistent,
      settingsStore.issue
    );
  }

  return sanitizeRule(
    nextRule,
    input.isDefault === true && nextRule.active
      ? nextRule.id
      : settingsStore.settings.defaultRuleId
  );
}

export async function updateRule(ruleId, input) {
  const rulesStore = await loadRulesStore();
  const target = rulesStore.store.rules.find((rule) => rule.id === ruleId);

  if (!target) {
    throw new Error("Regola non trovata.");
  }

  const nextRule = {
    ...target,
    name: normalizeText(input.name) || target.name,
    titlePrefix: normalizeText(input.titlePrefix) || target.titlePrefix,
    descriptionPrefix:
      normalizeText(input.descriptionPrefix) || target.descriptionPrefix,
    linkUrl: hasOwn(input, "linkUrl") ? normalizeText(input.linkUrl) : target.linkUrl,
    thumbnailMode: normalizeThumbnailMode(input.thumbnailMode, target.thumbnailMode),
    active: input.active !== false,
    usageDescription: normalizeText(input.usageDescription ?? input.notes),
    updatedAt: new Date().toISOString()
  };

  const nextRules = rulesStore.store.rules.map((rule) =>
    rule.id === ruleId ? nextRule : rule
  );

  if (!nextRules.some((rule) => rule.active)) {
    throw new Error("Deve restare almeno una regola attiva.");
  }

  if (input.isDefault === true && !nextRule.active) {
    throw new Error("Una regola predefinita deve restare attiva.");
  }

  await saveRulesStore(
    {
      ...rulesStore.store,
      rules: nextRules
    },
    rulesStore.persistent,
    rulesStore.issue
  );

  const settingsStore = await loadSettingsStore({
    ...rulesStore,
    store: {
      ...rulesStore.store,
      rules: nextRules
    }
  });

  const fallbackRule =
    nextRules.find((rule) => rule.active && rule.id !== nextRule.id) ||
    nextRules.find((rule) => rule.active);
  let nextDefaultRuleId = settingsStore.settings.defaultRuleId;

  if (input.isDefault === true && nextRule.active) {
    nextDefaultRuleId = nextRule.id;
  } else if (!nextRule.active && settingsStore.settings.defaultRuleId === nextRule.id) {
    nextDefaultRuleId = fallbackRule?.id || "";
  } else if (input.isDefault === false && settingsStore.settings.defaultRuleId === nextRule.id) {
    nextDefaultRuleId = fallbackRule?.id || nextRule.id;
  }

  if (nextDefaultRuleId !== settingsStore.settings.defaultRuleId) {
    await saveSettingsStore(
      {
        ...settingsStore.settings,
        defaultRuleId: nextDefaultRuleId
      },
      settingsStore.persistent,
      settingsStore.issue
    );
  }

  return sanitizeRule(nextRule, nextDefaultRuleId);
}

export async function updateOperationalSettings(input) {
  const rulesStore = await loadRulesStore();
  const settingsStore = await loadSettingsStore(rulesStore);
  const activeRuleIds = new Set(rulesStore.store.rules.filter((rule) => rule.active).map((rule) => rule.id));
  const nextDefaultRuleId = normalizeText(input.defaultRuleId) || settingsStore.settings.defaultRuleId;
  const pinterestInput = input.pinterest || {};
  const nextPinterestAppSecret =
    hasOwn(pinterestInput, "appSecret") && normalizeText(pinterestInput.appSecret)
      ? normalizeText(pinterestInput.appSecret)
      : settingsStore.settings.pinterest.appSecret;
  const nextPinterestAccessToken =
    hasOwn(pinterestInput, "accessToken") && normalizeText(pinterestInput.accessToken)
      ? normalizeText(pinterestInput.accessToken)
      : settingsStore.settings.pinterest.accessToken;

  if (!activeRuleIds.has(nextDefaultRuleId)) {
    throw new Error("Seleziona una regola attiva come default operativo.");
  }

  const nextSettings = {
    ...settingsStore.settings,
    appName: normalizeText(input.appName) || settingsStore.settings.appName,
    defaultRuleId: nextDefaultRuleId,
    sharePoint: {
      driveName:
        normalizeText(input.sharePoint?.driveName) || settingsStore.settings.sharePoint.driveName,
      baseFolder:
        normalizeText(input.sharePoint?.baseFolder) || settingsStore.settings.sharePoint.baseFolder
    },
    pinterest: {
      appId: hasOwn(pinterestInput, "appId")
        ? normalizeText(pinterestInput.appId)
        : settingsStore.settings.pinterest.appId,
      appSecret: nextPinterestAppSecret,
      accessToken: nextPinterestAccessToken,
      titlePrefix:
        normalizeText(input.pinterest?.titlePrefix) ||
        settingsStore.settings.pinterest.titlePrefix,
      descriptionPrefix:
        normalizeText(input.pinterest?.descriptionPrefix) ||
        settingsStore.settings.pinterest.descriptionPrefix,
      linkUrl:
        hasOwn(pinterestInput, "linkUrl")
          ? normalizeText(pinterestInput.linkUrl)
          : settingsStore.settings.pinterest.linkUrl,
      thumbnailMode: normalizeThumbnailMode(
        input.pinterest?.thumbnailMode,
        settingsStore.settings.pinterest.thumbnailMode
      )
    },
    version: 1
  };

  if (!nextSettings.sharePoint.driveName || !nextSettings.sharePoint.baseFolder) {
    throw new Error("Libreria SharePoint e cartella base non possono essere vuote.");
  }

  if (
    !nextSettings.pinterest.titlePrefix ||
    !nextSettings.pinterest.descriptionPrefix
  ) {
    throw new Error("Compila titolo e descrizione operativi Pinterest.");
  }

  await saveSettingsStore(nextSettings, settingsStore.persistent, settingsStore.issue);
  return sanitizeSettings(nextSettings);
}

export async function updatePinterestAccessToken(accessToken) {
  const rulesStore = await loadRulesStore();
  const settingsStore = await loadSettingsStore(rulesStore);
  const normalizedToken = normalizeText(accessToken);

  if (!normalizedToken) {
    throw new Error("Pinterest non ha restituito un access token valido.");
  }

  const nextSettings = {
    ...settingsStore.settings,
    pinterest: {
      ...settingsStore.settings.pinterest,
      accessToken: normalizedToken
    }
  };

  await saveSettingsStore(nextSettings, settingsStore.persistent, settingsStore.issue);
  return sanitizeSettings(nextSettings);
}

export async function getRuntimeConfig(ruleId = "") {
  const config = getConfig();
  const adminState = await getAdminState();
  const rulesStore = await loadRulesStore();
  const settingsStore = await loadSettingsStore(rulesStore);
  const privateSettings = settingsStore.settings;
  let selectedRule = null;

  if (ruleId) {
    selectedRule = adminState.rules.find((rule) => rule.id === ruleId);
    if (!selectedRule || !selectedRule.active) {
      throw new Error("Regola richiesta non disponibile o non attiva.");
    }
  }

  selectedRule =
    selectedRule ||
    adminState.rules.find((rule) => rule.id === adminState.settings.defaultRuleId && rule.active) ||
    adminState.rules.find((rule) => rule.active) ||
    adminState.rules[0] ||
    sanitizeRule(buildDefaultRule(config), adminState.settings.defaultRuleId);

  return {
    config: {
      ...config,
      sharePoint: {
        ...config.sharePoint,
        driveName: privateSettings.sharePoint.driveName,
        baseFolder: privateSettings.sharePoint.baseFolder
      },
      pinterest: {
        ...config.pinterest,
        appId: privateSettings.pinterest.appId || config.pinterest.appId,
        appSecret: privateSettings.pinterest.appSecret || config.pinterest.appSecret,
        accessToken: privateSettings.pinterest.accessToken || config.pinterest.accessToken,
        titlePrefix: selectedRule.titlePrefix || adminState.settings.pinterest.titlePrefix,
        descriptionPrefix:
          selectedRule.descriptionPrefix || adminState.settings.pinterest.descriptionPrefix,
        linkUrl: privateSettings.pinterest.linkUrl,
        thumbnailMode:
          selectedRule.thumbnailMode || adminState.settings.pinterest.thumbnailMode
      }
    },
    selectedRule,
    rules: adminState.rules,
    settings: adminState.settings,
    persistent: adminState.persistent,
    issue: adminState.issue,
    storageLabel: adminState.storageLabel
  };
}
