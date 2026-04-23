"use client";

import { useEffect, useMemo, useState } from "react";

const VIEWS = [
  { key: "azione", label: "Azione", icon: "play" },
  { key: "explorer", label: "Explorer", icon: "folder" },
  { key: "log", label: "Log", icon: "log" },
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
  const [explorerLoading, setExplorerLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [systemInfo, setSystemInfo] = useState(null);
  const [rootFolders, setRootFolders] = useState([]);
  const [season, setSeason] = useState("");
  const [level5Folders, setLevel5Folders] = useState([]);
  const [selectedLevel5s, setSelectedLevel5s] = useState([]);
  const [level6Groups, setLevel6Groups] = useState([]);
  const [selectedTargetPaths, setSelectedTargetPaths] = useState([]);
  const [explorerData, setExplorerData] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [operationLogs, setOperationLogs] = useState([]);
  const [actionNotice, setActionNotice] = useState(null);
  const [explorerNotice, setExplorerNotice] = useState(null);
  const [userNotice, setUserNotice] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [createUserForm, setCreateUserForm] = useState(buildCreateUserForm());
  const [editUserForm, setEditUserForm] = useState(buildEditUserForm());

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

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setBootLoading(true);

      try {
        const [systemPayload, explorerPayload] = await Promise.all([
          fetchJson("/api/system"),
          fetchJson("/api/explorer")
        ]);

        if (cancelled) {
          return;
        }

        setSystemInfo(systemPayload);
        setExplorerData(explorerPayload);
        setRootFolders(explorerPayload.folders ?? []);
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
        text: "Da Explorer puoi aggiungere solo cartelle di terzo livello o superiori."
      });
      return;
    }

    const nextSeason = segments[0];
    const level5Path = segments.slice(0, 2).join("/");

    if (season && season !== nextSeason) {
      setActionNotice({
        type: "error",
        text: "La selezione da Explorer deve appartenere alla stessa stagione gia scelta."
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
      text: `Cartella aggiunta dalla navigazione: ${subPath}`
    });
    setActiveView("azione");
  }

  async function loadPreview() {
    if (!selectedTargetPaths.length) {
      setActionNotice({
        type: "error",
        text: "Seleziona almeno una sotto-sotto-cartella prima di caricare l'anteprima."
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
        body: JSON.stringify({ subPaths: selectedTargetPaths })
      });

      setPreview(payload);
      setActionNotice({
        type: "success",
        text: `Anteprima pronta su ${formatPaths(payload.sourcePaths)}`
      });
      appendLog({
        action: "Anteprima",
        status: "ok",
        paths: payload.sourcePaths,
        scannedCount: payload.scannedCount,
        generatedCount: payload.generatedCount,
        skippedCount: payload.skippedCount,
        message: `${payload.previewItems.length} card mostrate`
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
        text: "Carica prima l'anteprima con le cartelle attualmente selezionate."
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
        body: JSON.stringify({ subPaths: selectedTargetPaths })
      });

      setResult(payload);
      setActionNotice({
        type: "success",
        text: `CSV generato correttamente su ${formatPaths(payload.sourcePaths)}`
      });
      appendLog({
        action: "Generazione CSV",
        status: "ok",
        paths: payload.sourcePaths,
        scannedCount: payload.scannedCount,
        generatedCount: payload.generatedCount,
        skippedCount: payload.skippedCount,
        message: payload.csvFilename
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

  const allLevel5Paths = useMemo(() => useAllValues(level5Folders), [level5Folders]);
  const allTargetPaths = useMemo(
    () => level6Groups.flatMap((group) => group.folders.map((folder) => folder.subPath)),
    [level6Groups]
  );
  const currentUser = systemInfo?.auth?.currentUser ?? null;
  const selectedUser = useMemo(
    () => users.find((entry) => entry.id === selectedUserId) || null,
    [users, selectedUserId]
  );
  const latestLog = operationLogs[0] ?? null;
  const latestSuccessLog = operationLogs.find((entry) => entry.status === "ok") ?? null;
  const previewReady =
    preview &&
    preview.selectedSubPaths?.length === selectedTargetPaths.length &&
    selectedTargetPaths.every((path) => preview.selectedSubPaths.includes(path));

  const metrics = [
    {
      label: "Stagione",
      value: season || "Non selezionata",
      note: "livello 4"
    },
    {
      label: "Sotto-cartelle",
      value: selectedLevel5s.length || 0,
      note: `${level5Folders.length} disponibili`
    },
    {
      label: "Sotto-sotto-cartelle",
      value: selectedTargetPaths.length || 0,
      note: `${allTargetPaths.length} disponibili`
    },
    {
      label: "Ultimo stato",
      value: getStatusLabel(latestLog),
      note: latestLog ? formatDateTime(latestLog.timestamp) : "nessuna operazione"
    }
  ];

  return (
    <main className="workspace-shell">
      <aside className="workspace-sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">I</div>
          <div>
            <div className="brand-title">ISAIA e ISAIA</div>
            <div className="brand-subtitle">Controllo Pinterest</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {VIEWS.map((item) => (
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
            <div>
              <strong>{currentUser?.displayName || "Sessione in avvio"}</strong>
              <span>{currentUser ? formatRole(currentUser.role) : "Caricamento utente"}</span>
            </div>
          </div>
        </div>
      </aside>

      <section className="workspace-main">
        <header className="topbar">
          <div>
            <div className="topbar-kicker">Dashboard operativa</div>
            <h1>{VIEWS.find((item) => item.key === activeView)?.label ?? "Dashboard"}</h1>
          </div>

          <div className="topbar-actions">
            <span className="live-badge">Dati live</span>
            {currentUser ? (
              <div className="user-pill">
                <span className="user-pill-name">{currentUser.displayName}</span>
                <span className="user-pill-role">{formatRole(currentUser.role)}</span>
              </div>
            ) : null}
            <button className="icon-button" type="button" onClick={switchTheme}>
              <Glyph name={theme === "dark" ? "sun" : "moon"} />
              <span>{theme === "dark" ? "Tema chiaro" : "Tema scuro"}</span>
            </button>
            <button className="panel-button subtle" type="button" onClick={handleLogout}>
              <Glyph name="logout" />
              <span>Esci</span>
            </button>
            <div className="topbar-wordmark">ISAIA</div>
          </div>
        </header>

        <section className="hero-panel">
          <div>
            <div className="hero-title-row">
              <h2>Selezione multipla cartelle</h2>
              <span className="tag">Anteprima + CSV</span>
            </div>
            <p className="hero-copy">
              Scegli una stagione e costruisci i percorsi finali da usare per l&apos;anteprima e per
              la generazione del CSV.
            </p>
          </div>

          <div className="hero-path">
            <span className="meta-label">Percorsi finali selezionati</span>
            <strong>{formatPaths(selectedTargetPaths)}</strong>
          </div>
        </section>

        <section className="metric-row">
          {metrics.map((metric) => (
            <article className="metric-card" key={metric.label}>
              <span className="metric-label">{metric.label}</span>
              <strong className="metric-value">{metric.value}</strong>
              <span className="metric-note">{metric.note}</span>
            </article>
          ))}
        </section>

        {activeView === "azione" ? (
          <>
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h3>Selezione cartelle</h3>
                  <p>Scegli la stagione e poi le cartelle finali da usare per anteprima e CSV.</p>
                </div>
              </div>

              <div className="form-grid">
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

              <div className="multi-grid">
                <article className="selector-panel">
                  <div className="selector-head">
                    <div>
                      <h4>Sotto-cartelle</h4>
                      <p>Livello 5 della stagione selezionata.</p>
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
                          ? "Caricamento sotto-cartelle..."
                          : "Seleziona una stagione per vedere le sotto-cartelle."}
                      </div>
                    ) : null}
                  </div>
                </article>

                <article className="selector-panel">
                  <div className="selector-head">
                    <div>
                      <h4>Cartelle finali</h4>
                      <p>Livello 6 usato per anteprima e CSV.</p>
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
                          ? "Caricamento cartelle finali..."
                          : "Seleziona una o piu sotto-cartelle per vedere le cartelle finali."}
                      </div>
                    ) : null}
                  </div>
                </article>
              </div>

              <div className="selection-summary">
                <div className="summary-item">
                  <span>Sotto-cartelle scelte</span>
                  <strong>{selectedLevel5s.length}</strong>
                </div>
                <div className="summary-item">
                  <span>Percorsi finali scelti</span>
                  <strong>{selectedTargetPaths.length}</strong>
                </div>
                <div className="summary-item">
                  <span>Modalita</span>
                  <strong>
                    {selectedTargetPaths.length === allTargetPaths.length && allTargetPaths.length
                      ? "Tutte le cartelle finali"
                      : "Selezione manuale"}
                  </strong>
                </div>
                <div className="summary-item">
                  <span>Regola immagini</span>
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
                <div className="empty-preview">
                  Scegli una o piu cartelle finali e carica l&apos;anteprima prima della generazione.
                </div>
              )}
            </section>
          </>
        ) : null}

        {activeView === "explorer" ? (
          <section className="panel explorer-panel">
            <div className="panel-head">
              <div>
                <h3>Explorer SharePoint</h3>
                <p>Naviga le cartelle reali e aggiungi alla selezione solo quelle finali utili per il CSV.</p>
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
                    <span>Aggiungi questa cartella</span>
                  </button>
                ) : null}
              </div>
            </div>

            <div className="breadcrumbs">
              {explorerData?.breadcrumbs?.map((crumb, index) => (
                <button
                  key={`${crumb.subPath}-${index}`}
                  className="breadcrumb"
                  type="button"
                  onClick={() => openExplorer(crumb.subPath)}
                >
                  {crumb.label}
                </button>
              ))}
            </div>

            {explorerNotice ? <div className={`notice ${explorerNotice.type}`}>{explorerNotice.text}</div> : null}

            <div className="explorer-grid">
              <article className="explorer-column">
                <div className="column-head">
                  <h4>Cartelle</h4>
                  <span>{explorerData?.folders?.length ?? 0}</span>
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
                        <strong>Cartella superiore</strong>
                      </span>
                    </button>
                  ) : null}

                  {(explorerData?.folders ?? []).map((folder) => (
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
                          Aggiungi
                        </button>
                      ) : null}
                    </div>
                  ))}

                  {!explorerData?.folders?.length ? (
                    <div className="empty-block">Nessuna cartella disponibile in questo livello.</div>
                  ) : null}
                </div>
              </article>

              <article className="explorer-column">
                <div className="column-head">
                  <h4>File</h4>
                  <span>{explorerData?.files?.length ?? 0}</span>
                </div>

                <div className="explorer-list">
                  {(explorerData?.files ?? []).map((file) => (
                    <div className="file-row" key={`${file.name}-${file.serverRelativeUrl}`}>
                      <span className="row-main">
                        <Glyph name={file.isImage ? "image" : "log"} />
                        <span>
                          <strong>{file.name}</strong>
                          <small>{formatBytes(file.size)}</small>
                        </span>
                      </span>
                      <span className={`file-badge ${file.isImage ? "image" : ""}`}>
                        {file.isImage ? "immagine" : "file"}
                      </span>
                    </div>
                  ))}

                  {!explorerData?.files?.length ? (
                    <div className="empty-block">Nessun file diretto in questa cartella.</div>
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
                <h3>Log operazioni</h3>
                <p>Storico locale con cartelle SharePoint usate, conteggi e stato finale.</p>
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

        {activeView === "utenti" ? (
          <section className="two-column-grid">
            <article className="panel">
              <div className="panel-head">
                <div>
                  <h3>Utenti</h3>
                  <p>Gestisci gli accessi alla dashboard e controlla lo stato delle route pubbliche.</p>
                </div>
                {currentUser?.role === "admin" ? (
                  <button className="panel-button subtle" type="button" onClick={() => refreshUsers()} disabled={usersLoading}>
                    <Glyph name="refresh" />
                    <span>{usersLoading ? "Aggiornamento..." : "Aggiorna"}</span>
                  </button>
                ) : null}
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
                  <strong>{systemInfo?.auth?.usersPersistent ? "Vercel Blob cifrato" : "Solo bootstrap"}</strong>
                </div>
                <div className="info-card">
                  <span>Media pubblici</span>
                  <strong>/media aperta</strong>
                </div>
              </div>

              {currentUser?.role === "admin" ? (
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
              ) : (
                <div className="empty-block">Solo un amministratore puo creare o modificare utenti.</div>
              )}
            </article>

            <article className="panel">
              <div className="panel-head">
                <div>
                  <h3>Gestione accessi</h3>
                  <p>Crea un nuovo utente oppure aggiorna quello selezionato.</p>
                </div>
              </div>

              {userNotice ? <div className={`notice ${userNotice.type}`}>{userNotice.text}</div> : null}

              {currentUser?.role === "admin" ? (
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
                              placeholder="Lascia vuoto per non cambiarla"
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
              ) : (
                <div className="empty-block">Solo un amministratore puo modificare gli utenti.</div>
              )}
            </article>
          </section>
        ) : null}

        {activeView === "impostazioni" ? (
          <section className="panel">
            <div className="panel-head">
              <div>
                <h3>Impostazioni operative</h3>
                <p>Valori attivi usati dall&apos;app per SharePoint, accesso e generazione CSV.</p>
              </div>
            </div>

            <div className="settings-grid">
              <div className="setting-card">
                <span>Sito SharePoint</span>
                <strong>{systemInfo?.settings.sharePointUrl ?? "Caricamento..."}</strong>
              </div>
              <div className="setting-card">
                <span>Libreria</span>
                <strong>{systemInfo?.settings.library ?? "Caricamento..."}</strong>
              </div>
              <div className="setting-card">
                <span>Cartella base</span>
                <strong>{systemInfo?.settings.baseFolder ?? "Caricamento..."}</strong>
              </div>
              <div className="setting-card">
                <span>Titolo fisso</span>
                <strong>{systemInfo?.settings.titlePrefix ?? "Caricamento..."}</strong>
              </div>
              <div className="setting-card">
                <span>Descrizione fissa</span>
                <strong>{systemInfo?.settings.descriptionPrefix ?? "Caricamento..."}</strong>
              </div>
              <div className="setting-card">
                <span>Link</span>
                <strong>{systemInfo?.settings.linkUrl ?? "Caricamento..."}</strong>
              </div>
              <div className="setting-card">
                <span>Thumbnail</span>
                <strong>{systemInfo?.settings.thumbnailMode ?? "Caricamento..."}</strong>
              </div>
              <div className="setting-card">
                <span>Media URL</span>
                <strong>{systemInfo?.settings.mediaMode ?? "Caricamento..."}</strong>
              </div>
              <div className="setting-card">
                <span>Accesso dashboard</span>
                <strong>Login con sessione firmata</strong>
              </div>
              <div className="setting-card">
                <span>Storage utenti</span>
                <strong>{systemInfo?.auth?.usersPersistent ? "Vercel Blob cifrato" : "Solo bootstrap"}</strong>
              </div>
            </div>
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
