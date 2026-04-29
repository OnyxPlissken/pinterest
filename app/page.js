"use client";

import { useEffect, useMemo, useState } from "react";
import { buildRulePreview } from "../lib/pinterest-format";

const BASE_VIEWS = [
  { key: "azione", label: "Azione", icon: "play" },
  { key: "pinterest", label: "Pinterest", icon: "image" },
  { key: "explorer", label: "Archivio", icon: "folder" },
  { key: "log", label: "Storico", icon: "log" },
  { key: "regole", label: "Regole", icon: "rules" },
  { key: "profilo", label: "Profilo", icon: "profile" },
  { key: "utenti", label: "Utenti", icon: "users" },
  { key: "impostazioni", label: "Impostazioni", icon: "settings" }
];

const LOG_STORAGE_KEY = "isaia-pinterest-log";

function Glyph({ name }) {
  const glyphs = {
    play: (
      <path
        d="M8 6.5v11l8-5.5-8-5.5Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    ),
    folder: (
      <path
        d="M4 7.5h5l1.6 2H20v8.8a1.7 1.7 0 0 1-1.7 1.7H5.7A1.7 1.7 0 0 1 4 18.3V7.5Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    ),
    log: (
      <path
        d="M7 5.5h10M7 10.5h10M7 15.5h6M4.5 5.5h.5M4.5 10.5h.5M4.5 15.5h.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    ),
    users: (
      <path
        d="M8.5 11.2a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4Zm7 1.2a2.3 2.3 0 1 0 0-4.6M4.5 18c.5-2 2.2-3.2 4-3.2S12 16 12.5 18m1.7 0c.4-1.5 1.7-2.4 3.1-2.4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    ),
    profile: (
      <path
        d="M12 12a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 12 12Zm-5.6 6c.8-2.3 3-3.7 5.6-3.7s4.8 1.4 5.6 3.7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    ),
    settings: (
      <path
        d="M12 8.7A3.3 3.3 0 1 0 12 15.3 3.3 3.3 0 0 0 12 8.7Zm7.1 3.3-.9-.5a5.6 5.6 0 0 0-.4-1l.5-.9-1.6-1.6-.9.5c-.3-.2-.7-.3-1-.4l-.5-.9h-2.6l-.5.9c-.3.1-.7.2-1 .4l-.9-.5-1.6 1.6.5.9c-.2.3-.3.7-.4 1l-.9.5v2.2l.9.5c.1.3.2.7.4 1l-.5.9 1.6 1.6.9-.5c.3.2.7.3 1 .4l.5.9h2.6l.5-.9c.3-.1.7-.2 1-.4l.9.5 1.6-1.6-.5-.9c.2-.3.3-.7.4-1l.9-.5z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.3"
      />
    ),
    rules: (
      <path
        d="M6 7.5h12M6 12h8M6 16.5h10M16.5 7.5a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Zm-3 4.5a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Zm4 4.5a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    ),
    moon: (
      <path
        d="M15.4 4.8a7 7 0 1 0 3.8 10.4 6.5 6.5 0 0 1-3.8-10.4Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    ),
    sun: (
      <path
        d="M12 3.8v2M12 18.2v2M20.2 12h-2M5.8 12h-2M17.8 6.2l-1.4 1.4M7.6 16.4l-1.4 1.4M17.8 17.8l-1.4-1.4M7.6 7.6 6.2 6.2M12 8.2A3.8 3.8 0 1 0 12 15.8 3.8 3.8 0 0 0 12 8.2Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    ),
    chevron: (
      <path
        d="m9 6 6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    ),
    back: (
      <path
        d="m15 6-6 6 6 6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    ),
    refresh: (
      <path
        d="M18 8.6V4.5h-4.1M6 15.4v4.1h4.1M18 8.6A6.8 6.8 0 0 0 6.6 6.3M6 15.4A6.8 6.8 0 0 0 17.4 17.7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    ),
    image: (
      <path
        d="M4 6.5h16v11H4zM8 10.1a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Zm12 4.9-4.2-4.2L11 15l-2.2-2.2L4 17.6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    ),
    shield: (
      <path
        d="M12 4 6.5 6v4.7c0 3.4 2.2 6.4 5.5 7.3 3.3-.9 5.5-3.9 5.5-7.3V6L12 4Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    ),
    plus: (
      <path
        d="M12 5v14M5 12h14"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    ),
    check: (
      <path
        d="m5 12 4.2 4.2L19 6.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    ),
    logout: (
      <path
        d="M14 5.2V4.8A1.8 1.8 0 0 0 12.2 3H6.8A1.8 1.8 0 0 0 5 4.8v14.4A1.8 1.8 0 0 0 6.8 21h5.4a1.8 1.8 0 0 0 1.8-1.8v-.4M10 12h9m-3-3 3 3-3 3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    ),
    open: (
      <path
        d="M14 5h5v5M10 14 19 5M19 13v4.2A1.8 1.8 0 0 1 17.2 19H6.8A1.8 1.8 0 0 1 5 17.2V6.8A1.8 1.8 0 0 1 6.8 5H11"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    )
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {glyphs[name] ?? glyphs.play}
    </svg>
  );
}

function createLogId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function formatDateTime(value) {
  if (!value) {
    return "Ora non disponibile";
  }

  return new Date(value).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatBytes(value) {
  if (!value) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  let size = Number(value);
  let index = 0;

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }

  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatPaths(paths = []) {
  if (!paths.length) {
    return "Nessun percorso";
  }

  if (paths.length === 1) {
    return paths[0];
  }

  return `${paths.length} cartelle selezionate`;
}

function getPrivacyLabel(value) {
  const normalized = String(value || "").toUpperCase();
  if (normalized === "PUBLIC") {
    return "Pubblica";
  }
  if (normalized === "PROTECTED" || normalized === "SECRET") {
    return "Privata";
  }
  if (normalized === "PUBLIC_AND_SECRET") {
    return "Pubblica + privata";
  }
  if (normalized === "ALL") {
    return "Tutte";
  }
  return value || "Privacy non indicata";
}

function toggleArrayValue(values, nextValue) {
  return values.includes(nextValue)
    ? values.filter((value) => value !== nextValue)
    : [...values, nextValue];
}

function useAllValues(values) {
  return values.map((value) => value.subPath);
}

function getStatusLabel(entry) {
  if (!entry) {
    return "In attesa";
  }

  return entry.status === "ok" ? "Completato" : "Errore";
}

function buildCreateUserForm() {
  return {
    username: "",
    displayName: "",
    password: "",
    role: "editor",
    active: true
  };
}

function buildEditUserForm(user) {
  return {
    displayName: user?.displayName || "",
    password: "",
    role: user?.role || "editor",
    active: user?.active ?? true
  };
}

function buildProfileForm(user) {
  return {
    displayName: user?.displayName || "",
    password: ""
  };
}

function buildRuleForm(rule) {
  return {
    name: rule?.name || "",
    titlePrefix: rule?.titlePrefix || "",
    descriptionPrefix: rule?.descriptionPrefix || "",
    linkUrl: rule?.linkUrl || "",
    thumbnailMode: rule?.thumbnailMode || "blank",
    active: rule?.active ?? true,
    isDefault: rule?.isDefault ?? false,
    usageDescription: rule?.usageDescription || rule?.notes || ""
  };
}

function buildSettingsForm(settings) {
  return {
    appName: settings?.appName || "Pinterest Assets Management",
    defaultRuleId: settings?.defaultRuleId || "",
    driveName: settings?.sharePoint?.driveName || settings?.library || "",
    baseFolder: settings?.sharePoint?.baseFolder || settings?.baseFolder || "",
    pinterestAppId: settings?.pinterest?.appId || settings?.pinterestAppId || "",
    pinterestAppSecret: "",
    pinterestAppSecretConfigured:
      settings?.pinterest?.appSecretConfigured || settings?.pinterestAppSecretConfigured || false,
    pinterestAccessToken: "",
    pinterestAccessTokenConfigured:
      settings?.pinterest?.accessTokenConfigured ||
      settings?.pinterestAccessTokenConfigured ||
      false,
    titlePrefix: settings?.pinterest?.titlePrefix || settings?.titlePrefix || "",
    descriptionPrefix:
      settings?.pinterest?.descriptionPrefix || settings?.descriptionPrefix || "",
    linkUrl: settings?.pinterest?.linkUrl || settings?.linkUrl || "",
    thumbnailMode: settings?.pinterest?.thumbnailMode || settings?.thumbnailMode || "blank"
  };
}

function collectSections(sectionsByBoard = {}) {
  return Object.values(sectionsByBoard).flatMap((sections) => sections || []);
}

function formatRole(role) {
  return role === "admin" ? "Amministratore" : "Editor";
}

function getInitials(value) {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return "IP";
  }

  return parts.map((part) => part[0]?.toUpperCase() || "").join("");
}

export default function HomePage() {
  const [theme, setTheme] = useState("dark");
  const [activeView, setActiveView] = useState("azione");
  const [bootLoading, setBootLoading] = useState(true);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [explorerLoading, setExplorerLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [pinterestLoading, setPinterestLoading] = useState(false);
  const [systemInfo, setSystemInfo] = useState(null);
  const [rootFolders, setRootFolders] = useState([]);
  const [season, setSeason] = useState("");
  const [level5Folders, setLevel5Folders] = useState([]);
  const [selectedLevel5s, setSelectedLevel5s] = useState([]);
  const [level6Groups, setLevel6Groups] = useState([]);
  const [selectedTargetPaths, setSelectedTargetPaths] = useState([]);
  const [explorerData, setExplorerData] = useState(null);
  const [explorerQuery, setExplorerQuery] = useState("");
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [operationLogs, setOperationLogs] = useState([]);
  const [actionNotice, setActionNotice] = useState(null);
  const [explorerNotice, setExplorerNotice] = useState(null);
  const [userNotice, setUserNotice] = useState(null);
  const [rulesNotice, setRulesNotice] = useState(null);
  const [settingsNotice, setSettingsNotice] = useState(null);
  const [pinterestNotice, setPinterestNotice] = useState(null);
  const [pinterestTree, setPinterestTree] = useState({ boards: [], sectionsByBoard: {} });
  const [pinterestPins, setPinterestPins] = useState([]);
  const [pinterestContext, setPinterestContext] = useState(null);
  const [selectedPinterestBoardId, setSelectedPinterestBoardId] = useState("");
  const [selectedPinterestSectionId, setSelectedPinterestSectionId] = useState("");
  const [users, setUsers] = useState([]);
  const [rules, setRules] = useState([]);
  const [selectedRuleId, setSelectedRuleId] = useState("");
  const [selectedRuleEditorId, setSelectedRuleEditorId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [createUserForm, setCreateUserForm] = useState(buildCreateUserForm());
  const [editUserForm, setEditUserForm] = useState(buildEditUserForm());
  const [profileForm, setProfileForm] = useState(buildProfileForm());
  const [createRuleForm, setCreateRuleForm] = useState(buildRuleForm());
  const [editRuleForm, setEditRuleForm] = useState(buildRuleForm());
  const [settingsForm, setSettingsForm] = useState(buildSettingsForm());

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("isaia-theme");
    const systemTheme = window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
    const nextTheme = storedTheme || systemTheme;

    document.documentElement.dataset.theme = nextTheme;
    setTheme(nextTheme);
  }, []);

  useEffect(() => {
    try {
      const storedLogs = window.localStorage.getItem(LOG_STORAGE_KEY);
      if (!storedLogs) {
        return;
      }

      const parsedLogs = JSON.parse(storedLogs);
      if (Array.isArray(parsedLogs)) {
        setOperationLogs(parsedLogs);
      }
    } catch {}
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(operationLogs));
  }, [operationLogs]);

  async function refreshSystemState() {
    const [systemPayload, explorerPayload] = await Promise.all([
      fetchJson("/api/system"),
      fetchJson("/api/explorer")
    ]);

    setSystemInfo(systemPayload);
    setRules(systemPayload.rules ?? []);
    setSettingsForm(buildSettingsForm(systemPayload.settings));
    setExplorerData(explorerPayload);
    setRootFolders(explorerPayload.folders ?? []);

    return {
      systemPayload,
      explorerPayload
    };
  }

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setBootLoading(true);

      try {
        await refreshSystemState();

        if (cancelled) {
          return;
        }
      } catch (error) {
        if (!cancelled) {
          setActionNotice({
            type: "error",
            text: error instanceof Error ? error.message : "Errore durante il caricamento iniziale."
          });
        }
      } finally {
        if (!cancelled) {
          setBootLoading(false);
        }
      }
    }

    boot();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!systemInfo?.auth?.currentUser) {
      return;
    }

    if (systemInfo.auth.currentUser.role !== "admin") {
      setUsers([]);
      setSelectedUserId("");
      return;
    }

    refreshUsers(true);
  }, [systemInfo?.auth?.currentUser?.id, systemInfo?.auth?.currentUser?.role]);

  useEffect(() => {
    let cancelled = false;

    async function loadLevel5Folders() {
      if (!season) {
        setLevel5Folders([]);
        setSelectedLevel5s([]);
        setLevel6Groups([]);
        setSelectedTargetPaths([]);
        return;
      }

      setSectionsLoading(true);

      try {
        const payload = await fetchJson(`/api/explorer?subPath=${encodeURIComponent(season)}`);
        if (cancelled) {
          return;
        }

        setLevel5Folders(payload.folders ?? []);
        setSelectedLevel5s((current) => current.filter((path) => path.startsWith(`${season}/`)));
        setSelectedTargetPaths((current) =>
          current.filter((path) => path.startsWith(`${season}/`))
        );
        setPreview(null);
        setResult(null);
        setActionNotice(null);
      } catch (error) {
        if (!cancelled) {
          setActionNotice({
            type: "error",
            text:
              error instanceof Error
                ? error.message
                : "Errore durante il caricamento delle sotto-cartelle."
          });
        }
      } finally {
        if (!cancelled) {
          setSectionsLoading(false);
        }
      }
    }

    loadLevel5Folders();

    return () => {
      cancelled = true;
    };
  }, [season]);

  useEffect(() => {
    let cancelled = false;

    async function loadLevel6Folders() {
      if (!selectedLevel5s.length) {
        setLevel6Groups([]);
        setSelectedTargetPaths([]);
        return;
      }

      setCollectionsLoading(true);

      try {
        const payloads = await Promise.all(
          selectedLevel5s.map((subPath) =>
            fetchJson(`/api/explorer?subPath=${encodeURIComponent(subPath)}`)
          )
        );

        if (cancelled) {
          return;
        }

        const groups = payloads.map((payload) => ({
          parentSubPath: payload.currentSubPath,
          parentName: payload.breadcrumbs?.at(-1)?.label ?? payload.currentSubPath,
          folders: payload.folders ?? []
        }));

        const allTargets = groups.flatMap((group) => group.folders.map((folder) => folder.subPath));
        setLevel6Groups(groups);
        setSelectedTargetPaths((current) => current.filter((path) => allTargets.includes(path)));
        setPreview(null);
        setResult(null);
      } catch (error) {
        if (!cancelled) {
          setActionNotice({
            type: "error",
            text:
              error instanceof Error
                ? error.message
                : "Errore durante il caricamento delle sotto-sotto-cartelle."
          });
        }
      } finally {
        if (!cancelled) {
          setCollectionsLoading(false);
        }
      }
    }

    loadLevel6Folders();

    return () => {
      cancelled = true;
    };
  }, [selectedLevel5s]);

  useEffect(() => {
    const nextUser = users.find((entry) => entry.id === selectedUserId) || null;
    setEditUserForm(buildEditUserForm(nextUser));
  }, [users, selectedUserId]);

  useEffect(() => {
    setProfileForm(buildProfileForm(systemInfo?.auth?.currentUser));
  }, [systemInfo?.auth?.currentUser?.id, systemInfo?.auth?.currentUser?.displayName]);

  useEffect(() => {
    if (systemInfo?.auth?.currentUser?.role === "admin") {
      return;
    }

    if (activeView === "utenti") {
      setActiveView("profilo");
    }
  }, [activeView, systemInfo?.auth?.currentUser?.role]);

  useEffect(() => {
    if (activeView !== "pinterest" || pinterestTree.boards.length) {
      return;
    }

    refreshPinterestTree();
  }, [activeView, pinterestTree.boards.length]);

  useEffect(() => {
    const activeRules = rules.filter((rule) => rule.active);
    const fallbackRuleId =
      activeRules.find((rule) => rule.id === systemInfo?.settings?.defaultRuleId)?.id ||
      activeRules[0]?.id ||
      rules[0]?.id ||
      "";

    setSelectedRuleId((current) =>
      activeRules.some((rule) => rule.id === current) ? current : fallbackRuleId
    );
    setSelectedRuleEditorId((current) =>
      rules.some((rule) => rule.id === current) ? current : rules[0]?.id || ""
    );
  }, [rules, systemInfo?.settings?.defaultRuleId]);

  useEffect(() => {
    const nextRule = rules.find((entry) => entry.id === selectedRuleEditorId) || null;
    setEditRuleForm(buildRuleForm(nextRule));
  }, [rules, selectedRuleEditorId]);

  function switchTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("isaia-theme", nextTheme);
    setTheme(nextTheme);
  }

  function appendLog(entry) {
    setOperationLogs((currentLogs) => [
      {
        id: createLogId(),
        timestamp: new Date().toISOString(),
        ...entry
      },
      ...currentLogs
    ].slice(0, 50));
  }

  async function refreshUsers(silent = false) {
    if (systemInfo?.auth?.currentUser?.role !== "admin") {
      return;
    }

    if (!silent) {
      setUsersLoading(true);
    }

    try {
      const payload = await fetchJson("/api/users");
      const nextUsers = payload.users ?? [];

      setUsers(nextUsers);
      setSelectedUserId((current) =>
        current && nextUsers.some((user) => user.id === current) ? current : nextUsers[0]?.id || ""
      );
      setUserNotice(null);
    } catch (error) {
      setUserNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Errore durante il caricamento utenti."
      });
    } finally {
      if (!silent) {
        setUsersLoading(false);
      }
    }
  }

  function connectPinterestOAuth() {
    window.location.assign("/api/auth/pinterest/start");
  }

  async function refreshPinterestTree(silent = false) {
    if (!silent) {
      setPinterestLoading(true);
    }
    setPinterestNotice(null);

    try {
      const payload = await fetchJson("/api/pinterest-admin");
      const boards = payload.boards ?? [];
      const sectionsByBoard = payload.sectionsByBoard ?? {};

      setPinterestTree({ boards, sectionsByBoard });
      setSelectedPinterestBoardId((current) =>
        current && boards.some((board) => board.id === current) ? current : boards[0]?.id || ""
      );
    } catch (error) {
      setPinterestNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Errore durante il caricamento Pinterest."
      });
    } finally {
      if (!silent) {
        setPinterestLoading(false);
      }
    }
  }

  async function refreshPinterestPins(boardId = selectedPinterestBoardId, sectionId = selectedPinterestSectionId) {
    if (!boardId) {
      setPinterestPins([]);
      setPinterestContext(null);
      return;
    }

    setPinterestLoading(true);
    setPinterestNotice(null);

    try {
      const url = `/api/pinterest-admin?boardId=${encodeURIComponent(boardId)}${
        sectionId ? `&sectionId=${encodeURIComponent(sectionId)}` : ""
      }`;
      const payload = await fetchJson(url);

      setPinterestPins(payload.pins ?? []);
      setPinterestContext({
        board: payload.board,
        section: payload.section,
        sections: payload.sections ?? []
      });
    } catch (error) {
      setPinterestNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Errore durante il caricamento Pin."
      });
    } finally {
      setPinterestLoading(false);
    }
  }

  function handlePinterestBoardChange(event) {
    const boardId = event.target.value;
    setSelectedPinterestBoardId(boardId);
    setSelectedPinterestSectionId("");
    refreshPinterestPins(boardId, "");
  }

  function handlePinterestSectionChange(event) {
    const sectionId = event.target.value;
    setSelectedPinterestSectionId(sectionId);
    refreshPinterestPins(selectedPinterestBoardId, sectionId);
  }

  async function openExplorer(subPath = "") {
    setExplorerLoading(true);
    setExplorerNotice(null);

    try {
      const payload = await fetchJson(
        `/api/explorer?subPath=${encodeURIComponent(String(subPath || ""))}`
      );
      setExplorerData(payload);
    } catch (error) {
      setExplorerNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Errore durante la navigazione delle cartelle."
      });
    } finally {
      setExplorerLoading(false);
    }
  }

  function resetOutputs() {
    setPreview(null);
    setResult(null);
    setActionNotice(null);
  }

  function handleSeasonChange(event) {
    setSeason(event.target.value);
    resetOutputs();
  }

  function handleRuleChange(event) {
    setSelectedRuleId(event.target.value);
    resetOutputs();
  }

  function toggleLevel5(subPath) {
    const isRemoving = selectedLevel5s.includes(subPath);
    setSelectedLevel5s((current) => toggleArrayValue(current, subPath));
    if (isRemoving) {
      setSelectedTargetPaths((current) =>
        current.filter((path) => !path.startsWith(`${subPath}/`))
      );
    }
    resetOutputs();
  }

  function toggleLevel6(subPath) {
    setSelectedTargetPaths((current) => toggleArrayValue(current, subPath));
    resetOutputs();
  }

  function addExplorerSelection(subPath) {
    const segments = String(subPath).split("/").filter(Boolean);
    if (segments.length < 3) {
      setActionNotice({
        type: "error",
        text: "Da Archivio puoi aggiungere solo cartelle finali utili alla produzione del CSV."
      });
      return;
    }

    const nextSeason = segments[0];
    const level5Path = segments.slice(0, 2).join("/");

    if (season && season !== nextSeason) {
      setActionNotice({
        type: "error",
        text: "La cartella scelta in Archivio deve appartenere alla stessa stagione gia selezionata."
      });
      return;
    }

    setSeason(nextSeason);
    setSelectedLevel5s((current) =>
      current.includes(level5Path) ? current : [...current, level5Path]
    );
    setSelectedTargetPaths((current) =>
      current.includes(subPath) ? current : [...current, subPath]
    );
    setPreview(null);
    setResult(null);
    setActionNotice({
      type: "info",
      text: `Cartella aggiunta alla selezione: ${subPath}`
    });
    setActiveView("azione");
  }

  async function loadPreview() {
    if (!selectedTargetPaths.length) {
      setActionNotice({
        type: "error",
        text: "Seleziona almeno una cartella finale prima di caricare l'anteprima."
      });
      return;
    }

    setPreviewLoading(true);
    setActionNotice(null);
    setResult(null);

    try {
      const payload = await fetchJson("/api/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ subPaths: selectedTargetPaths, ruleId: selectedRuleId })
      });

      setPreview(payload);
      setActionNotice({
        type: "success",
        text: `Anteprima pronta per ${formatPaths(payload.sourcePaths)}`
      });
      appendLog({
        action: "Anteprima",
        status: "ok",
        paths: payload.sourcePaths,
        scannedCount: payload.scannedCount,
        generatedCount: payload.generatedCount,
        skippedCount: payload.skippedCount,
        message: `${payload.previewItems.length} card mostrate${payload.rule?.name ? ` Â· ${payload.rule.name}` : ""}`
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Errore durante la creazione dell'anteprima.";

      setActionNotice({
        type: "error",
        text: message
      });
      appendLog({
        action: "Anteprima",
        status: "error",
        paths: [...selectedTargetPaths],
        message
      });
    } finally {
      setPreviewLoading(false);
    }
  }

  async function generateCsv() {
    if (!previewReady) {
      setActionNotice({
        type: "error",
        text: "Carica prima l'anteprima con la selezione corrente prima di generare il CSV."
      });
      return;
    }

    setGenerateLoading(true);
    setActionNotice(null);

    try {
      const payload = await fetchJson("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ subPaths: selectedTargetPaths, ruleId: selectedRuleId })
      });

      setResult(payload);
      setActionNotice({
        type: "success",
        text: `CSV generato correttamente per ${formatPaths(payload.sourcePaths)}`
      });
      appendLog({
        action: "Generazione CSV",
        status: "ok",
        paths: payload.sourcePaths,
        scannedCount: payload.scannedCount,
        generatedCount: payload.generatedCount,
        skippedCount: payload.skippedCount,
        message: `${payload.csvFilename}${payload.rule?.name ? ` Â· ${payload.rule.name}` : ""}`
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Errore durante la generazione del CSV.";

      setActionNotice({
        type: "error",
        text: message
      });
      appendLog({
        action: "Generazione CSV",
        status: "error",
        paths: [...selectedTargetPaths],
        message
      });
    } finally {
      setGenerateLoading(false);
    }
  }

  async function syncPinterest() {
    if (!previewReady) {
      setActionNotice({
        type: "error",
        text: "Carica prima l'anteprima con la selezione corrente prima di sincronizzare Pinterest."
      });
      return;
    }

    setSyncLoading(true);
    setActionNotice(null);

    try {
      const payload = await fetchJson("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ subPaths: selectedTargetPaths, ruleId: selectedRuleId })
      });
      const summary = payload.summary || {};
      const message = [
        `${summary.created || 0} creati`,
        `${summary.updated || 0} aggiornati`,
        `${summary.replaced || 0} sostituiti`,
        `${summary.deleted || 0} eliminati`,
        `${summary.unchanged || 0} invariati`
      ].join(", ");

      setActionNotice({
        type: summary.failed ? "error" : "success",
        text: summary.failed
          ? `Sync completato con ${summary.failed} errori: ${message}`
          : `Sync Pinterest completato: ${message}`
      });
      appendLog({
        action: "Sync Pinterest",
        status: summary.failed ? "error" : "ok",
        paths: payload.sourcePaths,
        scannedCount: payload.scannedCount,
        generatedCount: payload.generatedCount,
        skippedCount: payload.skippedCount,
        message
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Errore durante il sync Pinterest.";

      setActionNotice({
        type: "error",
        text: message
      });
      appendLog({
        action: "Sync Pinterest",
        status: "error",
        paths: [...selectedTargetPaths],
        message
      });
    } finally {
      setSyncLoading(false);
    }
  }

  function downloadCsv() {
    if (!result?.csvContent || !result?.csvFilename) {
      return;
    }

    const fileBlob = new Blob([result.csvContent], {
      type: "text/csv;charset=utf-8"
    });
    const objectUrl = window.URL.createObjectURL(fileBlob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = result.csvFilename;
    document.body.append(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(objectUrl);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST"
    }).catch(() => null);

    window.location.assign("/login");
  }

  function openProfileSettings() {
    setActiveView("profilo");
    setUserNotice(null);
  }

  async function handleCreateUser() {
    setUsersLoading(true);
    setUserNotice(null);

    try {
      const payload = await fetchJson("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(createUserForm)
      });

      await refreshUsers(true);
      setCreateUserForm(buildCreateUserForm());
      setSelectedUserId(payload.user?.id || "");
      setUserNotice({
        type: "success",
        text: `Utente creato: ${payload.user?.username || ""}`
      });
    } catch (error) {
      setUserNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Errore durante la creazione utente."
      });
    } finally {
      setUsersLoading(false);
    }
  }

  async function handleUpdateUser() {
    if (!selectedUserId) {
      setUserNotice({
        type: "error",
        text: "Seleziona prima un utente da modificare."
      });
      return;
    }

    setUsersLoading(true);
    setUserNotice(null);

    try {
      const payload = await fetchJson(`/api/users/${selectedUserId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(editUserForm)
      });

      await refreshUsers(true);
      setSelectedUserId(payload.user?.id || selectedUserId);
      setUserNotice({
        type: "success",
        text: `Utente aggiornato: ${payload.user?.username || ""}`
      });
    } catch (error) {
      setUserNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Errore durante l'aggiornamento utente."
      });
    } finally {
      setUsersLoading(false);
    }
  }

  async function handleUpdateOwnProfile() {
    if (!currentUser?.id) {
      return;
    }

    setUsersLoading(true);
    setUserNotice(null);

    try {
      const payload = await fetchJson(`/api/users/${currentUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(profileForm)
      });

      setProfileForm((current) => ({
        ...current,
        displayName: payload.user?.displayName || current.displayName,
        password: ""
      }));
      await refreshSystemState();
      setUserNotice({
        type: "success",
        text: "Profilo aggiornato."
      });
    } catch (error) {
      setUserNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Errore durante l'aggiornamento profilo."
      });
    } finally {
      setUsersLoading(false);
    }
  }

  async function handleCreateRule() {
    setRulesLoading(true);
    setRulesNotice(null);

    try {
      const payload = await fetchJson("/api/rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(createRuleForm)
      });

      await refreshSystemState();
      setCreateRuleForm(buildRuleForm());
      setSelectedRuleEditorId(payload.rule?.id || "");
      setRulesNotice({
        type: "success",
        text: `Regola creata: ${payload.rule?.name || ""}`
      });
    } catch (error) {
      setRulesNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Errore durante la creazione regola."
      });
    } finally {
      setRulesLoading(false);
    }
  }

  async function handleUpdateRule() {
    if (!selectedRuleEditorId) {
      setRulesNotice({
        type: "error",
        text: "Seleziona prima una regola da modificare."
      });
      return;
    }

    setRulesLoading(true);
    setRulesNotice(null);

    try {
      const payload = await fetchJson(`/api/rules/${selectedRuleEditorId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(editRuleForm)
      });

      await refreshSystemState();
      setSelectedRuleEditorId(payload.rule?.id || selectedRuleEditorId);
      setRulesNotice({
        type: "success",
        text: `Regola aggiornata: ${payload.rule?.name || ""}`
      });
    } catch (error) {
      setRulesNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Errore durante l'aggiornamento regola."
      });
    } finally {
      setRulesLoading(false);
    }
  }

  async function handleSaveSettings() {
    setSettingsLoading(true);
    setSettingsNotice(null);

    try {
      await fetchJson("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          appName: settingsForm.appName,
          defaultRuleId: settingsForm.defaultRuleId,
          sharePoint: {
            driveName: settingsForm.driveName,
            baseFolder: settingsForm.baseFolder
          },
          pinterest: {
            appId: settingsForm.pinterestAppId,
            appSecret: settingsForm.pinterestAppSecret,
            accessToken: settingsForm.pinterestAccessToken,
            titlePrefix: settingsForm.titlePrefix,
            descriptionPrefix: settingsForm.descriptionPrefix,
            linkUrl: settingsForm.linkUrl,
            thumbnailMode: settingsForm.thumbnailMode
          }
        })
      });

      setSeason("");
      setSelectedLevel5s([]);
      setSelectedTargetPaths([]);
      resetOutputs();
      await refreshSystemState();
      setSettingsNotice({
        type: "success",
        text: "Impostazioni aggiornate."
      });
    } catch (error) {
      setSettingsNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Errore durante il salvataggio impostazioni."
      });
    } finally {
      setSettingsLoading(false);
    }
  }

  const allLevel5Paths = useMemo(() => useAllValues(level5Folders), [level5Folders]);
  const allTargetPaths = useMemo(
    () => level6Groups.flatMap((group) => group.folders.map((folder) => folder.subPath)),
    [level6Groups]
  );
  const currentUser = systemInfo?.auth?.currentUser ?? null;
  const visibleViews = useMemo(
    () =>
      BASE_VIEWS.filter((item) => item.key !== "utenti" || currentUser?.role === "admin"),
    [currentUser?.role]
  );
  const selectedRule = useMemo(
    () => rules.find((entry) => entry.id === selectedRuleId) || null,
    [rules, selectedRuleId]
  );
  const selectedRuleEditor = useMemo(
    () => rules.find((entry) => entry.id === selectedRuleEditorId) || null,
    [rules, selectedRuleEditorId]
  );
  const selectedUser = useMemo(
    () => users.find((entry) => entry.id === selectedUserId) || null,
    [users, selectedUserId]
  );
  const selectedPinterestBoard = useMemo(
    () => pinterestTree.boards.find((board) => board.id === selectedPinterestBoardId) || null,
    [pinterestTree.boards, selectedPinterestBoardId]
  );
  const selectedPinterestSections = useMemo(
    () => pinterestTree.sectionsByBoard[selectedPinterestBoardId] || [],
    [pinterestTree.sectionsByBoard, selectedPinterestBoardId]
  );
  const allPinterestSections = useMemo(
    () => collectSections(pinterestTree.sectionsByBoard),
    [pinterestTree.sectionsByBoard]
  );
  const explorerQueryNormalized = explorerQuery.trim().toLowerCase();
  const filteredExplorerFolders = useMemo(() => {
    const folders = explorerData?.folders ?? [];
    if (!explorerQueryNormalized) {
      return folders;
    }

    return folders.filter((folder) =>
      [folder.name, folder.displayPath, folder.subPath]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(explorerQueryNormalized))
    );
  }, [explorerData?.folders, explorerQueryNormalized]);
  const filteredExplorerFiles = useMemo(() => {
    const files = explorerData?.files ?? [];
    if (!explorerQueryNormalized) {
      return files;
    }

    return files.filter((file) =>
      [file.name, file.serverRelativeUrl, file.mimeType]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(explorerQueryNormalized))
    );
  }, [explorerData?.files, explorerQueryNormalized]);
  const createRulePreview = useMemo(
    () =>
      buildRulePreview({
        titlePrefix: createRuleForm.titlePrefix,
        descriptionPrefix: createRuleForm.descriptionPrefix
      }),
    [createRuleForm.descriptionPrefix, createRuleForm.titlePrefix]
  );
  const editRulePreview = useMemo(
    () =>
      buildRulePreview({
        titlePrefix: editRuleForm.titlePrefix,
        descriptionPrefix: editRuleForm.descriptionPrefix
      }),
    [editRuleForm.descriptionPrefix, editRuleForm.titlePrefix]
  );
  const latestSuccessLog = operationLogs.find((entry) => entry.status === "ok") ?? null;
  const previewReady =
    preview &&
    preview.selectedSubPaths?.length === selectedTargetPaths.length &&
    selectedTargetPaths.every((path) => preview.selectedSubPaths.includes(path));

  return (
    <main className="workspace-shell">
      <aside className="workspace-sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">I</div>
          <div>
            <div className="brand-title">ISAIA e ISAIA</div>
            <div className="brand-subtitle">
              {systemInfo?.settings?.appName || "Pinterest Assets Management"}
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {visibleViews.map((item) => (
            <button
              key={item.key}
              className={`sidebar-link ${activeView === item.key ? "active" : ""}`}
              type="button"
              onClick={() => setActiveView(item.key)}
            >
              <span className="sidebar-link-icon">
                <Glyph name={item.icon} />
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-meta">
          <div className="meta-block">
            <span className="meta-label">Root SharePoint</span>
            <strong>{systemInfo?.settings.baseFolder ?? "Caricamento..."}</strong>
          </div>
          <div className="meta-user">
            <div className="meta-avatar">{getInitials(currentUser?.displayName)}</div>
            <div className="meta-user-copy">
              <strong>{currentUser?.displayName || "Sessione in avvio"}</strong>
              <span>{currentUser ? formatRole(currentUser.role) : "Caricamento utente"}</span>
            </div>
            <div className="meta-user-actions">
              <button className="icon-button compact" type="button" onClick={openProfileSettings} title="Profilo utente">
                <Glyph name="settings" />
              </button>
              <button className="icon-button compact" type="button" onClick={handleLogout} title="Esci">
                <Glyph name="logout" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <section className="workspace-main">
        <header className="topbar">
          <div>
            <div className="topbar-kicker">Dashboard operativa</div>
            <h1>{visibleViews.find((item) => item.key === activeView)?.label ?? "Dashboard"}</h1>
          </div>

          <div className="topbar-actions">
            <button className="icon-button" type="button" onClick={switchTheme}>
              <Glyph name={theme === "dark" ? "sun" : "moon"} />
              <span>{theme === "dark" ? "Tema chiaro" : "Tema scuro"}</span>
            </button>
            <div className="topbar-wordmark">ISAIA</div>
          </div>
        </header>

        {activeView === "azione" ? (
          <>
            <section className="hero-panel compact">
              <div>
                <div className="hero-title-row">
                  <h2>Produzione CSV</h2>
                  <span className="tag">Anteprima + CSV</span>
                </div>
                <p className="hero-copy">
                  Seleziona gli asset finali, verifica il risultato e genera il file pronto per Pinterest.
                </p>
              </div>

              <div className="hero-inline">
                <div className="hero-path">
                  <span className="meta-label">Percorsi</span>
                  <strong>{formatPaths(selectedTargetPaths)}</strong>
                </div>
                <div className="hero-path">
                  <span className="meta-label">Regola</span>
                  <strong>{selectedRule?.name || "Nessuna regola"}</strong>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h3>Selezione contenuti</h3>
                  <p>Definisci stagione, linee creative e cartelle finali da usare per anteprima e CSV.</p>
                </div>
              </div>

              <div className="form-grid">
                <label className="field">
                  <span>Regola</span>
                  <select
                    className="select-field"
                    value={selectedRuleId}
                    onChange={handleRuleChange}
                    disabled={!rules.length}
                  >
                    {(rules.filter((rule) => rule.active).length ? rules.filter((rule) => rule.active) : rules).map((rule) => (
                      <option key={rule.id} value={rule.id}>
                        {rule.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Stagione</span>
                  <select
                    className="select-field"
                    value={season}
                    onChange={handleSeasonChange}
                    disabled={bootLoading}
                  >
                    <option value="">Seleziona stagione</option>
                    {rootFolders.map((folder) => (
                      <option key={folder.subPath || folder.name} value={folder.name}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="selection-summary compact">
                <div className="summary-item">
                  <span>Uso regola</span>
                  <strong>{selectedRule?.usageDescription || "Preset operativo per titoli, descrizioni e link."}</strong>
                </div>
              </div>

              <div className="multi-grid">
                <article className="selector-panel">
                  <div className="selector-head">
                    <div>
                      <h4>Linee creative</h4>
                      <p>Seleziona i gruppi di contenuto del livello 5 della stagione scelta.</p>
                    </div>
                    <div className="inline-actions">
                      <button
                        className="panel-button subtle"
                        type="button"
                        disabled={!level5Folders.length || sectionsLoading}
                        onClick={() => {
                          setSelectedLevel5s(allLevel5Paths);
                          resetOutputs();
                        }}
                      >
                        Tutte
                      </button>
                      <button
                        className="panel-button subtle"
                        type="button"
                        disabled={!selectedLevel5s.length}
                        onClick={() => {
                          setSelectedLevel5s([]);
                          setSelectedTargetPaths([]);
                          resetOutputs();
                        }}
                      >
                        Pulisci
                      </button>
                    </div>
                  </div>

                  <div className="checklist-panel">
                    {level5Folders.map((folder) => (
                      <label className="check-row" key={folder.subPath}>
                        <input
                          type="checkbox"
                          checked={selectedLevel5s.includes(folder.subPath)}
                          onChange={() => toggleLevel5(folder.subPath)}
                        />
                        <span>{folder.name}</span>
                      </label>
                    ))}

                    {!level5Folders.length ? (
                      <div className="empty-block">
                        {sectionsLoading
                          ? "Sto leggendo le linee creative disponibili..."
                          : "Seleziona una stagione per visualizzare le linee creative disponibili."}
                      </div>
                    ) : null}
                  </div>
                </article>

                <article className="selector-panel">
                  <div className="selector-head">
                    <div>
                      <h4>Cartelle finali</h4>
                      <p>Scegli le cartelle di livello 6 da cui leggere i contenuti finali.</p>
                    </div>
                    <div className="inline-actions">
                      <button
                        className="panel-button subtle"
                        type="button"
                        disabled={!allTargetPaths.length || collectionsLoading}
                        onClick={() => {
                          setSelectedTargetPaths(allTargetPaths);
                          resetOutputs();
                        }}
                      >
                        Tutte
                      </button>
                      <button
                        className="panel-button subtle"
                        type="button"
                        disabled={!selectedTargetPaths.length}
                        onClick={() => {
                          setSelectedTargetPaths([]);
                          resetOutputs();
                        }}
                      >
                        Pulisci
                      </button>
                    </div>
                  </div>

                  <div className="checklist-panel grouped">
                    {level6Groups.map((group) => (
                      <div className="check-group" key={group.parentSubPath}>
                        <div className="check-group-title">{group.parentName}</div>
                        {group.folders.map((folder) => (
                          <label className="check-row" key={folder.subPath}>
                            <input
                              type="checkbox"
                              checked={selectedTargetPaths.includes(folder.subPath)}
                              onChange={() => toggleLevel6(folder.subPath)}
                            />
                            <span>{folder.name}</span>
                          </label>
                        ))}
                      </div>
                    ))}

                    {!level6Groups.length ? (
                      <div className="empty-block">
                        {collectionsLoading
                          ? "Sto leggendo le cartelle finali disponibili..."
                          : "Seleziona una o piu linee creative per visualizzare le cartelle finali."}
                      </div>
                    ) : null}
                  </div>
                </article>
              </div>

              <div className="selection-summary">
                <div className="summary-item">
                  <span>Linee creative selezionate</span>
                  <strong>{selectedLevel5s.length}</strong>
                </div>
                <div className="summary-item">
                  <span>Cartelle finali selezionate</span>
                  <strong>{selectedTargetPaths.length}</strong>
                </div>
                <div className="summary-item">
                  <span>Regola in uso</span>
                  <strong>{selectedRule?.name || "Nessuna regola"}</strong>
                </div>
                <div className="summary-item">
                  <span>Modalita selezione</span>
                  <strong>
                    {selectedTargetPaths.length === allTargetPaths.length && allTargetPaths.length
                      ? "Tutte le cartelle finali"
                      : "Selezione manuale"}
                  </strong>
                </div>
                <div className="summary-item">
                  <span>Criterio immagini</span>
                  <strong>Per ogni LOOK resta il file con numero finale piu basso.</strong>
                </div>
              </div>

              {selectedTargetPaths.length ? (
                <div className="selected-chip-wrap">
                  {selectedTargetPaths.map((path) => (
                    <button
                      key={path}
                      className="selected-chip"
                      type="button"
                      onClick={() => toggleLevel6(path)}
                    >
                      <span>{path}</span>
                      <Glyph name="check" />
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="action-row">
                <button
                  className="primary-button"
                  type="button"
                  onClick={loadPreview}
                  disabled={!selectedTargetPaths.length || previewLoading}
                >
                  <Glyph name="image" />
                  <span>{previewLoading ? "Anteprima..." : "Carica anteprima"}</span>
                </button>
                <button
                  className="primary-button"
                  type="button"
                  onClick={generateCsv}
                  disabled={!previewReady || generateLoading}
                >
                  <Glyph name="play" />
                  <span>{generateLoading ? "Generazione..." : "Genera CSV"}</span>
                </button>
                <button
                  className="primary-button"
                  type="button"
                  onClick={syncPinterest}
                  disabled={!previewReady || syncLoading}
                >
                  <Glyph name="refresh" />
                  <span>{syncLoading ? "Sync..." : "Sincronizza"}</span>
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={downloadCsv}
                  disabled={!result?.csvContent}
                >
                  <Glyph name="log" />
                  <span>Scarica CSV</span>
                </button>
              </div>

              {actionNotice ? <div className={`notice ${actionNotice.type}`}>{actionNotice.text}</div> : null}
            </section>

            <section className="preview-panel panel">
              <div className="panel-head">
                <div>
                  <h3>Anteprima contenuti</h3>
                  <p>Scegli una o piu cartelle finali e carica l&apos;anteprima prima della generazione.</p>
                </div>
                <div className="preview-meta">
                  <span>{preview ? `${preview.generatedCount} pin validi` : "Nessuna anteprima"}</span>
                  <span>{preview ? `${preview.scannedCount} file letti` : "In attesa"}</span>
                </div>
              </div>

              {preview ? (
                <>
                  <div className="preview-summary-row">
                    <div className="summary-item">
                      <span>Cartelle operative</span>
                      <strong>{formatPaths(preview.sourcePaths)}</strong>
                    </div>
                    <div className="summary-item">
                      <span>Regola</span>
                      <strong>{preview.rule?.name || selectedRule?.name || "Standard"}</strong>
                    </div>
                    <div className="summary-item">
                      <span>Scarti</span>
                      <strong>{preview.skippedCount}</strong>
                    </div>
                    <div className="summary-item">
                      <span>CSV</span>
                      <strong>{result?.csvFilename ?? "Non ancora generato"}</strong>
                    </div>
                  </div>

                  <div className="preview-grid">
                    {preview.previewItems.map((item) => (
                      <article className="preview-card" key={`${item.sourceSubPath}-${item.filename}`}>
                        <div className="preview-image-wrap">
                          <img className="preview-image" src={item.imageUrl} alt={item.title} />
                        </div>

                        <div className="preview-compose">
                          <div className="compose-field">
                            <span className="compose-label">Titolo</span>
                            <div className="compose-box">{item.title}</div>
                          </div>
                          <div className="compose-field">
                            <span className="compose-label">Descrizione</span>
                            <div className="compose-box compose-box-large">{item.description}</div>
                          </div>
                          <div className="compose-field">
                            <span className="compose-label">Link</span>
                            <div className="compose-box">{item.link}</div>
                          </div>
                          <div className="compose-field">
                            <span className="compose-label">Bacheca</span>
                            <div className="compose-box">{item.board}</div>
                          </div>

                          <div className="preview-info-grid">
                            <div className="preview-info-card">
                              <span>Cartella immagini</span>
                              <strong>{item.imageFolder}</strong>
                            </div>
                            <div className="preview-info-card">
                              <span>Sezione</span>
                              <strong>{item.section}</strong>
                            </div>
                            <div className="preview-info-card">
                              <span>Origine selezione</span>
                              <strong>{item.sourceSubPath}</strong>
                            </div>
                            <div className="preview-info-card">
                              <span>Regola</span>
                              <strong>{item.selectionRule}</strong>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <div className="empty-preview">Nessuna anteprima caricata.</div>
              )}
            </section>
          </>
        ) : null}

        {activeView === "pinterest" ? (
          <section className="pinterest-admin-page">
            <article className="panel">
              <div className="panel-head">
                <div>
                  <h3>Amministrazione Pinterest</h3>
                  <p>Naviga bacheche, sezioni e Pin pubblicati direttamente sull&apos;account collegato. Le bacheche private sono incluse quando il token Pinterest le espone via API.</p>
                </div>
                <button className="panel-button subtle" type="button" onClick={() => refreshPinterestTree()}>
                  <Glyph name="refresh" />
                  <span>{pinterestLoading ? "Aggiornamento..." : "Aggiorna"}</span>
                </button>
                <button className="panel-button subtle" type="button" onClick={connectPinterestOAuth}>
                  <Glyph name="open" />
                  <span>Connetti OAuth</span>
                </button>
              </div>

              {pinterestNotice ? <div className={`notice ${pinterestNotice.type}`}>{pinterestNotice.text}</div> : null}

              <div className="form-grid">
                <label className="field">
                  <span>Bacheca origine</span>
                  <select
                    className="select-field"
                    value={selectedPinterestBoardId}
                    onChange={handlePinterestBoardChange}
                    disabled={!pinterestTree.boards.length || pinterestLoading}
                  >
                    <option value="">Seleziona bacheca</option>
                    {pinterestTree.boards.map((board) => (
                      <option key={board.id} value={board.id}>
                        {board.name} Â· {getPrivacyLabel(board.privacy)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Sezione origine</span>
                  <select
                    className="select-field"
                    value={selectedPinterestSectionId}
                    onChange={handlePinterestSectionChange}
                    disabled={!selectedPinterestBoardId || pinterestLoading}
                  >
                    <option value="">Tutta la bacheca</option>
                    {selectedPinterestSections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="settings-grid">
                <div className="setting-card">
                  <span>Bacheche</span>
                  <strong>{pinterestTree.boards.length}</strong>
                </div>
                <div className="setting-card">
                  <span>Sezioni</span>
                  <strong>{allPinterestSections.length}</strong>
                </div>
                <div className="setting-card">
                  <span>Privacy origine</span>
                  <strong>{getPrivacyLabel(selectedPinterestBoard?.privacy)}</strong>
                </div>
                <div className="setting-card">
                  <span>Pin caricati</span>
                  <strong>{pinterestPins.length}</strong>
                </div>
              </div>

              <div className="pinterest-tree">
                {pinterestTree.boards.map((board) => (
                  <button
                    className={`pinterest-board-row ${board.id === selectedPinterestBoardId ? "active" : ""}`}
                    key={board.id}
                    type="button"
                    onClick={() => {
                      setSelectedPinterestBoardId(board.id);
                      setSelectedPinterestSectionId("");
                      refreshPinterestPins(board.id, "");
                    }}
                  >
                    <span>
                      <strong>{board.name}</strong>
                      <small>{getPrivacyLabel(board.privacy)} Â· {pinterestTree.sectionsByBoard[board.id]?.length || 0} sezioni</small>
                    </span>
                    <Glyph name="chevron" />
                  </button>
                ))}

                {!pinterestTree.boards.length ? (
                  <div className="empty-block">
                    {pinterestLoading ? "Sto leggendo le bacheche Pinterest..." : "Nessuna bacheca caricata."}
                  </div>
                ) : null}
              </div>
            </article>

            <article className="panel">
              <div className="panel-head">
                <div>
                  <h3>Pin pubblicati</h3>
                  <p>Consulta i Pin della bacheca o della sezione selezionata.</p>
                </div>
                <span className="tag soft">{pinterestPins.length} Pin</span>
              </div>

              <div className="pinterest-pin-grid">
                {pinterestPins.map((pin) => (
                  <article className="pinterest-pin-card" key={pin.id}>
                    <div className="pin-check">
                      <span>{pin.title || "Pin senza titolo"}</span>
                    </div>
                    {pin.imageUrl ? <img src={pin.imageUrl} alt={pin.title || pin.id} /> : <div className="pin-empty-image">No image</div>}
                    <div className="pin-meta">
                      <strong>{pin.boardName}</strong>
                      <span>{pin.sectionName || "Nessuna sezione"} · {getPrivacyLabel(pin.boardPrivacy)}</span>
                      {pin.link ? <small>{pin.link}</small> : <small>Link vuoto</small>}
                    </div>
                  </article>
                ))}

                {!pinterestPins.length ? (
                  <div className="empty-block">
                    {pinterestLoading
                      ? "Sto leggendo i Pin Pinterest..."
                      : "Seleziona una bacheca o una sezione per visualizzare i Pin."}
                  </div>
                ) : null}
              </div>
            </article>
          </section>
        ) : null}

        {activeView === "explorer" ? (
          <section className="panel explorer-panel">
            <div className="panel-head">
              <div>
                <h3>Archivio SharePoint</h3>
                <p>Esplora le cartelle di lavoro, cerca asset e aggiungi alla selezione solo i percorsi utili al CSV.</p>
              </div>
              <div className="inline-actions">
                <button className="panel-button subtle" type="button" onClick={() => openExplorer("")}>
                  <Glyph name="refresh" />
                  <span>{explorerLoading ? "Aggiornamento..." : "Aggiorna"}</span>
                </button>
                {explorerData?.canGenerate ? (
                  <button
                    className="panel-button"
                    type="button"
                    onClick={() => addExplorerSelection(explorerData.currentSubPath)}
                  >
                    <Glyph name="plus" />
                    <span>Usa questa cartella</span>
                  </button>
                ) : null}
              </div>
            </div>

            <div className="explorer-toolbar">
              <div className="breadcrumbs prominent">
                {explorerData?.breadcrumbs?.map((crumb, index) => (
                  <button
                    key={`${crumb.subPath}-${index}`}
                    className={`breadcrumb ${index === (explorerData?.breadcrumbs?.length ?? 0) - 1 ? "current" : ""}`}
                    type="button"
                    onClick={() => openExplorer(crumb.subPath)}
                  >
                    {crumb.label}
                  </button>
                ))}
              </div>

              <label className="field explorer-search">
                <span>Ricerca nella cartella aperta</span>
                <input
                  className="select-field"
                  type="search"
                  value={explorerQuery}
                  onChange={(event) => setExplorerQuery(event.target.value)}
                  placeholder="Cerca cartelle o file per nome"
                />
              </label>
            </div>

            <div className="selection-summary compact">
              <div className="summary-item">
                <span>Percorso corrente</span>
                <strong>{explorerData?.displayPath || systemInfo?.settings?.baseFolder || "-"}</strong>
              </div>
              <div className="summary-item">
                <span>Elementi trovati</span>
                <strong>{filteredExplorerFolders.length + filteredExplorerFiles.length}</strong>
              </div>
            </div>

            {explorerNotice ? <div className={`notice ${explorerNotice.type}`}>{explorerNotice.text}</div> : null}

            <div className="explorer-grid">
              <article className="explorer-column">
                <div className="column-head">
                  <h4>Cartelle</h4>
                  <span>{filteredExplorerFolders.length}</span>
                </div>

                <div className="explorer-list">
                  {explorerData?.currentSubPath ? (
                    <button
                      className="explorer-row"
                      type="button"
                      onClick={() => {
                        const segments = explorerData.currentSubPath.split("/").filter(Boolean);
                        openExplorer(segments.slice(0, -1).join("/"));
                      }}
                    >
                      <span className="row-main">
                        <Glyph name="back" />
                        <strong>Torna al livello precedente</strong>
                      </span>
                    </button>
                  ) : null}

                  {filteredExplorerFolders.map((folder) => (
                    <div className="explorer-row-wrap" key={folder.subPath || folder.displayPath}>
                      <button
                        className="explorer-row"
                        type="button"
                        onClick={() => openExplorer(folder.subPath)}
                      >
                        <span className="row-main">
                          <Glyph name="folder" />
                          <strong>{folder.name}</strong>
                        </span>
                        <Glyph name="chevron" />
                      </button>
                      {folder.subPath.split("/").filter(Boolean).length >= 3 ? (
                        <button
                          className="inline-link-button"
                          type="button"
                          onClick={() => addExplorerSelection(folder.subPath)}
                        >
                          Seleziona
                        </button>
                      ) : null}
                    </div>
                  ))}

                  {!filteredExplorerFolders.length ? (
                    <div className="empty-block">
                      {explorerQuery
                        ? "Nessuna cartella corrisponde alla ricerca corrente."
                        : "Nessuna cartella disponibile in questo livello."}
                    </div>
                  ) : null}
                </div>
              </article>

              <article className="explorer-column">
                <div className="column-head">
                  <h4>File</h4>
                  <span>{filteredExplorerFiles.length}</span>
                </div>

                <div className="explorer-list">
                  {filteredExplorerFiles.map((file) => (
                    <div className="file-row" key={`${file.name}-${file.serverRelativeUrl}`}>
                      <span className="row-main">
                        <Glyph name={file.isImage ? "image" : "log"} />
                        <span>
                          <strong>{file.name}</strong>
                          <small>{formatBytes(file.size)}</small>
                        </span>
                      </span>
                      <span className="file-actions">
                        <span className={`file-badge ${file.isImage ? "image" : ""}`}>
                          {file.isImage ? "immagine" : "file"}
                        </span>
                        {file.openUrl ? (
                          <a className="inline-link-button" href={file.openUrl} target="_blank" rel="noreferrer">
                            <Glyph name="open" />
                            <span>Apri</span>
                          </a>
                        ) : null}
                      </span>
                    </div>
                  ))}

                  {!filteredExplorerFiles.length ? (
                    <div className="empty-block">
                      {explorerQuery
                        ? "Nessun file corrisponde alla ricerca corrente."
                        : "Nessun file diretto in questa cartella."}
                    </div>
                  ) : null}
                </div>
              </article>
            </div>
          </section>
        ) : null}

        {activeView === "log" ? (
          <section className="panel">
            <div className="panel-head">
              <div>
                <h3>Storico lavorazioni</h3>
                <p>Storico locale delle anteprime e dei CSV generati, con cartelle SharePoint, volumi e stato finale.</p>
              </div>
              <button className="panel-button subtle" type="button" onClick={() => setOperationLogs([])}>
                <Glyph name="refresh" />
                <span>Svuota log</span>
              </button>
            </div>

            <div className="table-wrap">
              <table className="log-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Azione</th>
                    <th>Cartelle</th>
                    <th>Stato</th>
                    <th>File</th>
                    <th>Pin</th>
                    <th>Scarti</th>
                    <th>Messaggio</th>
                  </tr>
                </thead>
                <tbody>
                  {operationLogs.map((entry) => (
                    <tr key={entry.id}>
                      <td>{formatDateTime(entry.timestamp)}</td>
                      <td>{entry.action}</td>
                      <td>{(entry.paths ?? []).join(" | ") || "-"}</td>
                      <td>
                        <span className={`status-pill ${entry.status}`}>{getStatusLabel(entry)}</span>
                      </td>
                      <td>{entry.scannedCount ?? "-"}</td>
                      <td>{entry.generatedCount ?? "-"}</td>
                      <td>{entry.skippedCount ?? "-"}</td>
                      <td>{entry.message ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!operationLogs.length ? <div className="empty-block">Nessun log disponibile.</div> : null}
            </div>
          </section>
        ) : null}

        {activeView === "regole" ? (
          <section className="two-column-grid">
            <article className="panel">
              <div className="panel-head">
                <div>
                  <h3>Regole</h3>
                  <p>Gestisci i preset editoriali che governano titolo, descrizione, link e impostazione predefinita.</p>
                </div>
                {currentUser?.role === "admin" ? (
                  <button
                    className="panel-button subtle"
                    type="button"
                    onClick={async () => {
                      setRulesLoading(true);
                      try {
                        await refreshSystemState();
                      } finally {
                        setRulesLoading(false);
                      }
                    }}
                    disabled={rulesLoading}
                  >
                    <Glyph name="refresh" />
                    <span>{rulesLoading ? "Aggiornamento..." : "Aggiorna"}</span>
                  </button>
                ) : null}
              </div>

              <div className="info-grid">
                <div className="info-card">
                  <span>Regole attive</span>
                  <strong>{rules.filter((rule) => rule.active).length}</strong>
                </div>
                <div className="info-card">
                  <span>Regola predefinita</span>
                  <strong>
                    {rules.find((rule) => rule.id === systemInfo?.settings?.defaultRuleId)?.name || "-"}
                  </strong>
                </div>
                <div className="info-card">
                  <span>Archivio configurazione</span>
                  <strong>{systemInfo?.adminStore?.storageLabel || "Caricamento..."}</strong>
                </div>
              </div>

              {rulesNotice ? <div className={`notice ${rulesNotice.type}`}>{rulesNotice.text}</div> : null}
              {systemInfo?.adminStore?.issue ? (
                <div className="notice info">{systemInfo.adminStore.issue}</div>
              ) : null}

              <div className="user-list">
                {rules.map((rule) => (
                  <button
                    key={rule.id}
                    className={`user-row ${selectedRuleEditorId === rule.id ? "active" : ""}`}
                    type="button"
                    onClick={() => setSelectedRuleEditorId(rule.id)}
                  >
                    <div className="user-row-main">
                          <div className="user-avatar">{(rule.name || "R").slice(0, 2).toUpperCase()}</div>
                          <div className="user-copy">
                            <strong>{rule.name}</strong>
                            <span>{rule.usageDescription || rule.titlePrefix}</span>
                          </div>
                        </div>
                        <div className="user-row-meta">
                          <span className={`status-pill ${rule.active ? "ok" : "error"}`}>
                            {rule.active ? "Attiva" : "Disattiva"}
                          </span>
                          <small>{rule.isDefault ? "Predefinita" : rule.previewSection}</small>
                        </div>
                      </button>
                    ))}

                {!rules.length ? <div className="empty-block">Nessuna regola configurata.</div> : null}
              </div>
            </article>

            <article className="panel">
              <div className="panel-head">
                <div>
                  <h3>Impostazione regole</h3>
                  <p>Definisci i preset da usare per i contenuti Pinterest e verifica subito il risultato finale.</p>
                </div>
              </div>

              {currentUser?.role === "admin" ? (
                <div className="user-editor-stack">
                  <div className="editor-block">
                    <div className="editor-block-head">
                      <h4>Nuova regola</h4>
                    </div>

                    <div className="form-grid">
                      <label className="field">
                        <span>Nome regola</span>
                        <input
                          className="select-field"
                          type="text"
                          value={createRuleForm.name}
                          onChange={(event) =>
                            setCreateRuleForm((current) => ({
                              ...current,
                              name: event.target.value
                            }))
                          }
                          placeholder="Lookbook standard"
                        />
                      </label>
                      <label className="field">
                        <span>Descrizione d&apos;uso</span>
                        <input
                          className="select-field"
                          type="text"
                          value={createRuleForm.usageDescription}
                          onChange={(event) =>
                            setCreateRuleForm((current) => ({
                              ...current,
                              usageDescription: event.target.value
                            }))
                          }
                          placeholder="Per lookbook collezione principale"
                        />
                      </label>
                      <label className="field">
                        <span>Titolo fisso</span>
                        <input
                          className="select-field"
                          type="text"
                          value={createRuleForm.titlePrefix}
                          onChange={(event) =>
                            setCreateRuleForm((current) => ({
                              ...current,
                              titlePrefix: event.target.value
                            }))
                          }
                          placeholder="Isaia Napoli"
                        />
                      </label>
                      <label className="field">
                        <span>Descrizione fissa</span>
                        <input
                          className="select-field"
                          type="text"
                          value={createRuleForm.descriptionPrefix}
                          onChange={(event) =>
                            setCreateRuleForm((current) => ({
                              ...current,
                              descriptionPrefix: event.target.value
                            }))
                          }
                          placeholder="ISAIA Napoli"
                        />
                      </label>
                      <label className="field">
                        <span>Link</span>
                        <input
                          className="select-field"
                          type="url"
                          value={createRuleForm.linkUrl}
                          onChange={(event) =>
                            setCreateRuleForm((current) => ({
                              ...current,
                              linkUrl: event.target.value
                            }))
                          }
                          placeholder="https://www.isaia.it/"
                        />
                      </label>
                      <label className="field">
                        <span>Thumbnail</span>
                        <select
                          className="select-field"
                          value={createRuleForm.thumbnailMode}
                          onChange={(event) =>
                            setCreateRuleForm((current) => ({
                              ...current,
                              thumbnailMode: event.target.value
                            }))
                          }
                        >
                          <option value="blank">Vuota</option>
                          <option value="level5">Nome livello 5</option>
                        </select>
                      </label>
                    </div>

                    <div className="toggle-stack">
                      <label className="toggle-line">
                        <input
                          type="checkbox"
                          checked={createRuleForm.active}
                          onChange={(event) =>
                            setCreateRuleForm((current) => ({
                              ...current,
                              active: event.target.checked
                            }))
                          }
                        />
                        <span>Regola attiva</span>
                      </label>
                      <label className="toggle-line">
                        <input
                          type="checkbox"
                          checked={createRuleForm.isDefault}
                          onChange={(event) =>
                            setCreateRuleForm((current) => ({
                              ...current,
                              isDefault: event.target.checked
                            }))
                          }
                        />
                        <span>Usa come regola predefinita</span>
                      </label>
                    </div>

                    <div className="rule-preview-block">
                      <div className="editor-block-head">
                        <h4>Anteprima regola</h4>
                        <span className="tag soft">{createRulePreview.section}</span>
                      </div>
                      <div className="preview-info-grid">
                        <div className="preview-info-card">
                          <span>Title</span>
                          <strong>{createRulePreview.title || "-"}</strong>
                        </div>
                        <div className="preview-info-card">
                          <span>Description</span>
                          <strong>{createRulePreview.description || "-"}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="action-row">
                      <button className="primary-button" type="button" onClick={handleCreateRule} disabled={rulesLoading}>
                        <Glyph name="plus" />
                        <span>{rulesLoading ? "Salvataggio..." : "Crea regola"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="editor-block">
                    <div className="editor-block-head">
                      <h4>Modifica regola</h4>
                      <span className="tag soft">{selectedRuleEditor?.name || "Nessuna selezionata"}</span>
                    </div>

                    {selectedRuleEditor ? (
                      <>
                        <div className="form-grid">
                          <label className="field">
                            <span>Nome regola</span>
                            <input
                              className="select-field"
                              type="text"
                              value={editRuleForm.name}
                              onChange={(event) =>
                                setEditRuleForm((current) => ({
                                  ...current,
                                  name: event.target.value
                                }))
                              }
                            />
                          </label>
                          <label className="field">
                            <span>Descrizione d&apos;uso</span>
                            <input
                              className="select-field"
                              type="text"
                              value={editRuleForm.usageDescription}
                              onChange={(event) =>
                                setEditRuleForm((current) => ({
                                  ...current,
                                  usageDescription: event.target.value
                                }))
                              }
                            />
                          </label>
                          <label className="field">
                            <span>Titolo fisso</span>
                            <input
                              className="select-field"
                              type="text"
                              value={editRuleForm.titlePrefix}
                              onChange={(event) =>
                                setEditRuleForm((current) => ({
                                  ...current,
                                  titlePrefix: event.target.value
                                }))
                              }
                            />
                          </label>
                          <label className="field">
                            <span>Descrizione fissa</span>
                            <input
                              className="select-field"
                              type="text"
                              value={editRuleForm.descriptionPrefix}
                              onChange={(event) =>
                                setEditRuleForm((current) => ({
                                  ...current,
                                  descriptionPrefix: event.target.value
                                }))
                              }
                            />
                          </label>
                          <label className="field">
                            <span>Link</span>
                            <input
                              className="select-field"
                              type="url"
                              value={editRuleForm.linkUrl}
                              onChange={(event) =>
                                setEditRuleForm((current) => ({
                                  ...current,
                                  linkUrl: event.target.value
                                }))
                              }
                            />
                          </label>
                          <label className="field">
                            <span>Thumbnail</span>
                            <select
                              className="select-field"
                              value={editRuleForm.thumbnailMode}
                              onChange={(event) =>
                                setEditRuleForm((current) => ({
                                  ...current,
                                  thumbnailMode: event.target.value
                                }))
                              }
                            >
                              <option value="blank">Vuota</option>
                              <option value="level5">Nome livello 5</option>
                            </select>
                          </label>
                        </div>

                        <div className="toggle-stack">
                          <label className="toggle-line">
                            <input
                              type="checkbox"
                              checked={editRuleForm.active}
                              onChange={(event) =>
                                setEditRuleForm((current) => ({
                                  ...current,
                                  active: event.target.checked
                                }))
                              }
                            />
                            <span>Regola attiva</span>
                          </label>
                          <label className="toggle-line">
                            <input
                              type="checkbox"
                              checked={editRuleForm.isDefault}
                              onChange={(event) =>
                                setEditRuleForm((current) => ({
                                  ...current,
                                  isDefault: event.target.checked
                                }))
                              }
                            />
                            <span>Usa come regola predefinita</span>
                          </label>
                        </div>

                        <div className="user-detail-grid">
                          <div className="summary-item">
                            <span>Creata</span>
                            <strong>{formatDateTime(selectedRuleEditor.createdAt)}</strong>
                          </div>
                          <div className="summary-item">
                            <span>Aggiornata</span>
                            <strong>{formatDateTime(selectedRuleEditor.updatedAt)}</strong>
                          </div>
                          <div className="summary-item">
                            <span>Stato</span>
                            <strong>{selectedRuleEditor.isDefault ? "Predefinita" : "Secondaria"}</strong>
                          </div>
                        </div>

                        <div className="rule-preview-block">
                          <div className="editor-block-head">
                            <h4>Anteprima regola</h4>
                            <span className="tag soft">{editRulePreview.section}</span>
                          </div>
                          <div className="preview-info-grid">
                            <div className="preview-info-card">
                              <span>Title</span>
                              <strong>{editRulePreview.title || "-"}</strong>
                            </div>
                            <div className="preview-info-card">
                              <span>Description</span>
                              <strong>{editRulePreview.description || "-"}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="action-row">
                          <button className="primary-button" type="button" onClick={handleUpdateRule} disabled={rulesLoading}>
                            <Glyph name="check" />
                            <span>{rulesLoading ? "Salvataggio..." : "Salva regola"}</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="empty-block">Seleziona una regola per modificarla.</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="empty-block">Solo un amministratore puo creare o aggiornare le regole editoriali.</div>
              )}
            </article>
          </section>
        ) : null}

        {activeView === "profilo" ? (
          <section className="two-column-grid">
            <article className="panel">
              <div className="panel-head">
                <div>
                  <h3>Profilo</h3>
                  <p>Aggiorna i dati del tuo account e mantieni allineate le credenziali di accesso alla piattaforma.</p>
                </div>
              </div>

              <div className="info-grid">
                <div className="info-card">
                  <span>Sessione</span>
                  <strong>{currentUser ? "Attiva" : "Non disponibile"}</strong>
                </div>
                <div className="info-card">
                  <span>Ruolo corrente</span>
                  <strong>{currentUser ? formatRole(currentUser.role) : "-"}</strong>
                </div>
                <div className="info-card">
                  <span>Storage utenti</span>
                  <strong>
                    {systemInfo?.auth?.usersStorageLabel ||
                      (systemInfo?.auth?.usersPersistent
                        ? "SharePoint cifrato"
                        : systemInfo?.auth?.usersIssue || "Storage non disponibile")}
                  </strong>
                </div>
                <div className="info-card">
                  <span>Account</span>
                  <strong>{currentUser?.username || "-"}</strong>
                </div>
              </div>

              {!systemInfo?.auth?.usersPersistent && systemInfo?.auth?.usersIssue ? (
                <div className="notice info">{systemInfo.auth.usersIssue}</div>
              ) : null}

              <div className="selection-summary">
                <div className="summary-item">
                  <span>Nome visibile</span>
                  <strong>{currentUser?.displayName || "-"}</strong>
                </div>
                <div className="summary-item">
                  <span>Ruolo</span>
                  <strong>{currentUser ? formatRole(currentUser.role) : "-"}</strong>
                </div>
                <div className="summary-item">
                  <span>Ultimo accesso</span>
                  <strong>{formatDateTime(currentUser?.lastLoginAt)}</strong>
                </div>
              </div>
            </article>

            <article className="panel">
              <div className="panel-head">
                <div>
                  <h3>Dati account</h3>
                  <p>Modifica il nome visibile e, se necessario, aggiorna la password personale.</p>
                </div>
              </div>

              {userNotice ? <div className={`notice ${userNotice.type}`}>{userNotice.text}</div> : null}

              <div className="editor-block">
                <div className="editor-block-head">
                  <h4>Impostazioni profilo</h4>
                  <span className="tag soft">{currentUser?.username || "Utente"}</span>
                </div>

                <div className="form-grid">
                  <label className="field">
                    <span>Username</span>
                    <input
                      className="select-field"
                      type="text"
                      value={currentUser?.username || ""}
                      readOnly
                    />
                  </label>
                  <label className="field">
                    <span>Nome visibile</span>
                    <input
                      className="select-field"
                      type="text"
                      value={profileForm.displayName}
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          displayName: event.target.value
                        }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Nuova password</span>
                    <input
                      className="select-field"
                      type="password"
                      value={profileForm.password}
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          password: event.target.value
                        }))
                      }
                      placeholder="Lascia vuoto se non devi aggiornarla"
                    />
                  </label>
                  <label className="field">
                    <span>Ruolo</span>
                    <input
                      className="select-field"
                      type="text"
                      value={formatRole(currentUser?.role)}
                      readOnly
                    />
                  </label>
                </div>

                <div className="action-row">
                  <button className="primary-button" type="button" onClick={handleUpdateOwnProfile} disabled={usersLoading}>
                    <Glyph name="check" />
                    <span>{usersLoading ? "Salvataggio..." : "Salva profilo"}</span>
                  </button>
                </div>
              </div>
            </article>
          </section>
        ) : null}

        {activeView === "utenti" ? (
          currentUser?.role === "admin" ? (
            <section className="two-column-grid">
              <article className="panel">
                <div className="panel-head">
                  <div>
                    <h3>Utenti</h3>
                    <p>Gestisci gli accessi alla dashboard e assegna ruoli coerenti con il lavoro del team.</p>
                  </div>
                  <button className="panel-button subtle" type="button" onClick={() => refreshUsers()} disabled={usersLoading}>
                    <Glyph name="refresh" />
                    <span>{usersLoading ? "Aggiornamento..." : "Aggiorna"}</span>
                  </button>
                </div>

                <div className="info-grid">
                  <div className="info-card">
                    <span>Utenti attivi</span>
                    <strong>{users.filter((user) => user.active).length}</strong>
                  </div>
                  <div className="info-card">
                    <span>Amministratori</span>
                    <strong>{users.filter((user) => user.role === "admin" && user.active).length}</strong>
                  </div>
                  <div className="info-card">
                    <span>Archivio utenti</span>
                    <strong>
                      {systemInfo?.auth?.usersStorageLabel ||
                        (systemInfo?.auth?.usersPersistent
                          ? "SharePoint cifrato"
                          : systemInfo?.auth?.usersIssue || "Storage non disponibile")}
                    </strong>
                  </div>
                </div>

                {!systemInfo?.auth?.usersPersistent && systemInfo?.auth?.usersIssue ? (
                  <div className="notice info">{systemInfo.auth.usersIssue}</div>
                ) : null}

                <div className="user-list">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      className={`user-row ${selectedUserId === user.id ? "active" : ""}`}
                      type="button"
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      <div className="user-row-main">
                        <div className="user-avatar">{getInitials(user.displayName)}</div>
                        <div className="user-copy">
                          <strong>{user.displayName}</strong>
                          <span>{user.username}</span>
                        </div>
                      </div>
                      <div className="user-row-meta">
                        <span className={`status-pill ${user.active ? "ok" : "error"}`}>
                          {user.active ? "Attivo" : "Disattivo"}
                        </span>
                        <small>{formatRole(user.role)}</small>
                      </div>
                    </button>
                  ))}

                  {!users.length ? <div className="empty-block">Nessun utente configurato.</div> : null}
                </div>
              </article>

              <article className="panel">
                <div className="panel-head">
                  <div>
                    <h3>Gestione accessi</h3>
                    <p>Crea un nuovo utente oppure aggiorna i dati dell&apos;account selezionato.</p>
                  </div>
                </div>

                {userNotice ? <div className={`notice ${userNotice.type}`}>{userNotice.text}</div> : null}

                <div className="user-editor-stack">
                  <div className="editor-block">
                    <div className="editor-block-head">
                      <h4>Nuovo utente</h4>
                    </div>

                    <div className="form-grid">
                      <label className="field">
                        <span>Username</span>
                        <input
                          className="select-field"
                          type="text"
                          value={createUserForm.username}
                          onChange={(event) =>
                            setCreateUserForm((current) => ({
                              ...current,
                              username: event.target.value
                            }))
                          }
                          placeholder="m.rossi"
                        />
                      </label>
                      <label className="field">
                        <span>Nome visibile</span>
                        <input
                          className="select-field"
                          type="text"
                          value={createUserForm.displayName}
                          onChange={(event) =>
                            setCreateUserForm((current) => ({
                              ...current,
                              displayName: event.target.value
                            }))
                          }
                          placeholder="Mario Rossi"
                        />
                      </label>
                      <label className="field">
                        <span>Password</span>
                        <input
                          className="select-field"
                          type="password"
                          value={createUserForm.password}
                          onChange={(event) =>
                            setCreateUserForm((current) => ({
                              ...current,
                              password: event.target.value
                            }))
                          }
                          placeholder="Password iniziale"
                        />
                      </label>
                      <label className="field">
                        <span>Ruolo</span>
                        <select
                          className="select-field"
                          value={createUserForm.role}
                          onChange={(event) =>
                            setCreateUserForm((current) => ({
                              ...current,
                              role: event.target.value
                            }))
                          }
                        >
                          <option value="editor">Editor</option>
                          <option value="admin">Amministratore</option>
                        </select>
                      </label>
                    </div>

                    <label className="toggle-line">
                      <input
                        type="checkbox"
                        checked={createUserForm.active}
                        onChange={(event) =>
                          setCreateUserForm((current) => ({
                            ...current,
                            active: event.target.checked
                          }))
                        }
                      />
                      <span>Utente attivo</span>
                    </label>

                    <div className="action-row">
                      <button className="primary-button" type="button" onClick={handleCreateUser} disabled={usersLoading}>
                        <Glyph name="plus" />
                        <span>{usersLoading ? "Salvataggio..." : "Crea utente"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="editor-block">
                    <div className="editor-block-head">
                      <h4>Modifica utente</h4>
                      <span className="tag soft">{selectedUser ? selectedUser.username : "Nessuno selezionato"}</span>
                    </div>

                    {selectedUser ? (
                      <>
                        <div className="form-grid">
                          <label className="field">
                            <span>Username</span>
                            <input className="select-field" type="text" value={selectedUser.username} readOnly />
                          </label>
                          <label className="field">
                            <span>Nome visibile</span>
                            <input
                              className="select-field"
                              type="text"
                              value={editUserForm.displayName}
                              onChange={(event) =>
                                setEditUserForm((current) => ({
                                  ...current,
                                  displayName: event.target.value
                                }))
                              }
                            />
                          </label>
                          <label className="field">
                            <span>Nuova password</span>
                            <input
                              className="select-field"
                              type="password"
                              value={editUserForm.password}
                              onChange={(event) =>
                                setEditUserForm((current) => ({
                                  ...current,
                                  password: event.target.value
                                }))
                              }
                              placeholder="Lascia vuoto se non devi aggiornarla"
                            />
                          </label>
                          <label className="field">
                            <span>Ruolo</span>
                            <select
                              className="select-field"
                              value={editUserForm.role}
                              onChange={(event) =>
                                setEditUserForm((current) => ({
                                  ...current,
                                  role: event.target.value
                                }))
                              }
                            >
                              <option value="editor">Editor</option>
                              <option value="admin">Amministratore</option>
                            </select>
                          </label>
                        </div>

                        <label className="toggle-line">
                          <input
                            type="checkbox"
                            checked={editUserForm.active}
                            onChange={(event) =>
                              setEditUserForm((current) => ({
                                ...current,
                                active: event.target.checked
                              }))
                            }
                          />
                          <span>Utente attivo</span>
                        </label>

                        <div className="user-detail-grid">
                          <div className="summary-item">
                            <span>Creato</span>
                            <strong>{formatDateTime(selectedUser.createdAt)}</strong>
                          </div>
                          <div className="summary-item">
                            <span>Ultimo accesso</span>
                            <strong>{formatDateTime(selectedUser.lastLoginAt)}</strong>
                          </div>
                        </div>

                        <div className="action-row">
                          <button className="primary-button" type="button" onClick={handleUpdateUser} disabled={usersLoading}>
                            <Glyph name="check" />
                            <span>{usersLoading ? "Salvataggio..." : "Salva modifiche"}</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="empty-block">Seleziona un utente dalla lista per modificarlo.</div>
                    )}
                  </div>
                </div>
              </article>
            </section>
          ) : null
        ) : null}

        {activeView === "impostazioni" ? (
          <section className="two-column-grid">
            <article className="panel">
              <div className="panel-head">
                <div>
                  <h3>Impostazioni piattaforma</h3>
                  <p>Definisci i parametri operativi dell&apos;app e i dati Pinterest usati dall&apos;integrazione API.</p>
                </div>
              </div>

              {settingsNotice ? <div className={`notice ${settingsNotice.type}`}>{settingsNotice.text}</div> : null}
              {systemInfo?.adminStore?.issue ? (
                <div className="notice info">{systemInfo.adminStore.issue}</div>
              ) : null}

              {currentUser?.role === "admin" ? (
                <>
                  <div className="form-grid">
                    <label className="field">
                      <span>Nome applicazione</span>
                      <input
                        className="select-field"
                        type="text"
                        value={settingsForm.appName}
                        onChange={(event) =>
                          setSettingsForm((current) => ({
                            ...current,
                            appName: event.target.value
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Regola default</span>
                      <select
                        className="select-field"
                        value={settingsForm.defaultRuleId}
                        onChange={(event) =>
                          setSettingsForm((current) => ({
                            ...current,
                            defaultRuleId: event.target.value
                          }))
                        }
                      >
                        {rules.filter((rule) => rule.active).map((rule) => (
                          <option key={rule.id} value={rule.id}>
                            {rule.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Libreria SharePoint</span>
                      <input
                        className="select-field"
                        type="text"
                        value={settingsForm.driveName}
                        onChange={(event) =>
                          setSettingsForm((current) => ({
                            ...current,
                            driveName: event.target.value
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Cartella base</span>
                      <input
                        className="select-field"
                        type="text"
                        value={settingsForm.baseFolder}
                        onChange={(event) =>
                          setSettingsForm((current) => ({
                            ...current,
                            baseFolder: event.target.value
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Pinterest App ID</span>
                      <input
                        className="select-field"
                        type="text"
                        value={settingsForm.pinterestAppId}
                        onChange={(event) =>
                          setSettingsForm((current) => ({
                            ...current,
                            pinterestAppId: event.target.value
                          }))
                        }
                      />
                      <small className="field-note">
                        Inserisci l&apos;App ID ufficiale non appena l&apos;app Pinterest viene approvata.
                      </small>
                    </label>
                    <label className="field">
                      <span>Pinterest App Secret</span>
                      <input
                        className="select-field"
                        type="password"
                        value={settingsForm.pinterestAppSecret}
                        placeholder={
                          settingsForm.pinterestAppSecretConfigured
                            ? "Gia configurato. Inserisci solo per sostituirlo."
                            : "Inserisci il secret Pinterest"
                        }
                        onChange={(event) =>
                          setSettingsForm((current) => ({
                            ...current,
                            pinterestAppSecret: event.target.value
                          }))
                        }
                      />
                      <small className="field-note">
                        Il secret viene salvato nello storage amministrativo cifrato e non viene piu mostrato in chiaro.
                      </small>
                    </label>
                    <label className="field">
                      <span>Pinterest Access Token</span>
                      <input
                        className="select-field"
                        type="password"
                        value={settingsForm.pinterestAccessToken}
                        placeholder={
                          settingsForm.pinterestAccessTokenConfigured
                            ? "Gia configurato. Inserisci solo per sostituirlo."
                            : "Token API Pinterest"
                        }
                        onChange={(event) =>
                          setSettingsForm((current) => ({
                            ...current,
                            pinterestAccessToken: event.target.value
                          }))
                        }
                      />
                      <small className="field-note">
                        Usato solo server-side per creare, aggiornare e rimuovere Pin durante il sync.
                      </small>
                    </label>
                    <label className="field">
                      <span>Titolo fisso default</span>
                      <input
                        className="select-field"
                        type="text"
                        value={settingsForm.titlePrefix}
                        onChange={(event) =>
                          setSettingsForm((current) => ({
                            ...current,
                            titlePrefix: event.target.value
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Descrizione fissa default</span>
                      <input
                        className="select-field"
                        type="text"
                        value={settingsForm.descriptionPrefix}
                        onChange={(event) =>
                          setSettingsForm((current) => ({
                            ...current,
                            descriptionPrefix: event.target.value
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Link default opzionale</span>
                      <input
                        className="select-field"
                        type="text"
                        value={settingsForm.linkUrl}
                        onChange={(event) =>
                          setSettingsForm((current) => ({
                            ...current,
                            linkUrl: event.target.value
                          }))
                        }
                      />
                      <small className="field-note">
                        Puoi lasciare il campo vuoto oppure indicare un link fisso come https://www.isaia.it/.
                      </small>
                    </label>
                    <label className="field">
                      <span>Thumbnail default</span>
                      <select
                        className="select-field"
                        value={settingsForm.thumbnailMode}
                        onChange={(event) =>
                          setSettingsForm((current) => ({
                            ...current,
                            thumbnailMode: event.target.value
                          }))
                        }
                      >
                        <option value="blank">Vuota</option>
                        <option value="level5">Nome livello 5</option>
                      </select>
                    </label>
                  </div>

                  <div className="action-row">
                    <button className="primary-button" type="button" onClick={handleSaveSettings} disabled={settingsLoading}>
                      <Glyph name="check" />
                      <span>{settingsLoading ? "Salvataggio..." : "Salva impostazioni"}</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="empty-block">Solo un amministratore puo aggiornare le impostazioni della piattaforma.</div>
              )}
            </article>

            <article className="panel">
              <div className="panel-head">
                <div>
                  <h3>Stato piattaforma</h3>
                  <p>Panoramica sintetica dei parametri che governano il lavoro del team e delle aree protette.</p>
                </div>
              </div>

              <div className="settings-grid">
                <div className="setting-card">
                  <span>Sito SharePoint</span>
                  <strong>{systemInfo?.settings.sharePointUrl ?? "Caricamento..."}</strong>
                </div>
                <div className="setting-card">
                  <span>Storage amministrativo</span>
                  <strong>{systemInfo?.adminStore?.storageLabel || "Caricamento..."}</strong>
                </div>
                <div className="setting-card">
                  <span>Storage utenti</span>
                  <strong>
                    {systemInfo?.auth?.usersStorageLabel ||
                      (systemInfo?.auth?.usersPersistent
                        ? "SharePoint cifrato"
                        : systemInfo?.auth?.usersIssue || "Storage non disponibile")}
                  </strong>
                </div>
                <div className="setting-card">
                  <span>Media URL</span>
                  <strong>{systemInfo?.settings.mediaMode ?? "Caricamento..."}</strong>
                </div>
                <div className="setting-card">
                  <span>Pinterest API</span>
                  <strong>
                    {systemInfo?.settings?.pinterestApiReady
                      ? "Access token configurato"
                      : "In attesa access token"}
                  </strong>
                </div>
                <div className="setting-card">
                  <span>Accesso dashboard</span>
                  <strong>Login con sessione firmata</strong>
                </div>
              </div>
            </article>
          </section>
        ) : null}

        {bootLoading ? <div className="boot-state">Caricamento dashboard...</div> : null}
        {!bootLoading && latestSuccessLog ? (
          <footer className="footer-note">
            Ultima operazione completata: <strong>{latestSuccessLog.action}</strong> su{" "}
            <strong>{formatPaths(latestSuccessLog.paths)}</strong> il{" "}
            {formatDateTime(latestSuccessLog.timestamp)}.
          </footer>
        ) : null}
      </section>
    </main>
  );
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));

  if (response.status === 401 && typeof window !== "undefined") {
    window.location.assign("/login");
    throw new Error(payload.error || "Sessione non valida.");
  }

  if (!response.ok) {
    throw new Error(payload.error || "Richiesta non riuscita.");
  }

  return payload;
}



