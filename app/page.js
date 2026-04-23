"use client";

import { useEffect, useState } from "react";

const sidebarItems = [
  { label: "Dashboard", key: "dashboard", active: true },
  { label: "Collections", key: "collections" },
  { label: "Lookbook", key: "lookbook" },
  { label: "Media URLs", key: "media" },
  { label: "Export CSV", key: "export" },
  { label: "Rules", key: "rules" },
  { label: "Settings", key: "settings" }
];

const quickPaths = [
  { label: "SS26 / Lookbook", value: "SS26/Lookbook" },
  { label: "SS26 / Campaign", value: "SS26/Campaign" },
  { label: "FW26 / Lookbook", value: "FW26/Lookbook" }
];

function Glyph({ name }) {
  const glyphs = {
    dashboard: (
      <path
        d="M4 4h6v6H4zm10 0h6v10h-6zM4 14h6v6H4zm10 0h6v6h-6z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    ),
    collections: (
      <path
        d="M4 7.5 12 4l8 3.5L12 11 4 7.5Zm0 4L12 15l8-3.5M4 15.5 12 19l8-3.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    ),
    lookbook: (
      <path
        d="M6 5.5h8.8a2.2 2.2 0 0 1 2.2 2.2v10.8H8.2A2.2 2.2 0 0 0 6 20.7V5.5Zm0 0A2.2 2.2 0 0 0 3.8 7.7v10.8H14"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    ),
    media: (
      <path
        d="M4 6.5h16v11H4zM8 10.2a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6Zm12 4.8-4.4-4.4L11 15l-2.3-2.3L4 17.4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    ),
    export: (
      <path
        d="M12 4v9m0 0 3.4-3.4M12 13l-3.4-3.4M5 16.5V19h14v-2.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    ),
    rules: (
      <path
        d="M8 7h11M8 12h11M8 17h11M4.8 7h.4M4.8 12h.4M4.8 17h.4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    ),
    settings: (
      <path
        d="M12 8.8A3.2 3.2 0 1 0 12 15.2 3.2 3.2 0 0 0 12 8.8Zm7.2 3.2-.9-.5a6.8 6.8 0 0 0-.3-1l.5-.9-1.8-1.8-.9.5c-.3-.1-.7-.2-1-.4l-.5-.9h-2.6l-.5.9c-.3.1-.7.2-1 .4l-.9-.5-1.8 1.8.5.9c-.1.3-.2.7-.3 1l-.9.5v2.6l.9.5c.1.3.2.7.3 1l-.5.9 1.8 1.8.9-.5c.3.1.7.2 1 .4l.5.9h2.6l.5-.9c.3-.1.7-.2 1-.4l.9.5 1.8-1.8-.5-.9c.1-.3.2-.7.3-1l.9-.5z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    ),
    refresh: (
      <path
        d="M18 8.5V4.5h-4M6 15.5v4h4M18 8.5A7 7 0 0 0 6.5 6M6 15.5A7 7 0 0 0 17.5 18"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    ),
    theme: (
      <path
        d="M12 3.8v2.4M12 17.8v2.4M20.2 12h-2.4M6.2 12H3.8M17.7 6.3l-1.7 1.7M8 16l-1.7 1.7M17.7 17.7 16 16M8 8 6.3 6.3M12 8.2A3.8 3.8 0 1 0 12 15.8 3.8 3.8 0 0 0 12 8.2Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    ),
    spark: (
      <path
        d="m12 4 1.2 3.6L17 8.8l-3.8 1.2L12 14l-1.2-4L7 8.8l3.8-1.2z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    )
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {glyphs[name] ?? glyphs.dashboard}
    </svg>
  );
}

export default function HomePage() {
  const [subPath, setSubPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("isaia-theme");
    const systemTheme = window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
    const nextTheme = storedTheme || systemTheme;

    document.documentElement.dataset.theme = nextTheme;
    setTheme(nextTheme);
  }, []);

  function switchTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("isaia-theme", nextTheme);
    setTheme(nextTheme);
  }

  async function generateCsv() {
    if (!subPath.trim()) {
      setError("Su Vercel il run completo di 02_Collezioni va in timeout. Inserisci almeno una stagione o un tipo, ad esempio SS26/Lookbook.");
      setResult(null);
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ subPath })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Generazione non riuscita.");
      }

      setResult(payload);
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    generateCsv();
  }

  const stats = [
    {
      label: "Pins generated",
      value: result ? result.generatedCount : "Ready",
      eyebrow: "CSV output",
      note: result ? "ultima esecuzione" : "in attesa di esecuzione"
    },
    {
      label: "Assets scanned",
      value: result ? result.scannedCount : "02_Collezioni",
      eyebrow: "SharePoint source",
      note: result ? result.sourcePath : "scope base live"
    },
    {
      label: "Skipped files",
      value: result ? result.skippedCount : "Lowest frame",
      eyebrow: "Dedup logic",
      note: "1 immagine per look"
    },
    {
      label: "Media URLs",
      value: "Vercel Blob",
      eyebrow: "Public delivery",
      note: "link immagini pubblici"
    }
  ];

  return (
    <main className="dashboard-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-badge">I</div>
          <div>
            <div className="brand-title">ISAIA e ISAIA</div>
            <div className="brand-subtitle">Pinterest Operations</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {sidebarItems.map((item) => (
            <button
              key={item.key}
              className={`nav-item ${item.active ? "active" : ""}`}
              type="button"
            >
              <span className="nav-icon">
                <Glyph name={item.key} />
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">IP</div>
            <div>
              <strong>ISAIA Pinterest</strong>
              <span>Live workspace</span>
            </div>
          </div>
          <p>
            Root SharePoint: <code>Shared Folder/02_Collezioni</code>
          </p>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="topbar">
          <div className="topbar-heading">
            <button className="topbar-icon" type="button" aria-label="Dashboard view">
              <Glyph name="dashboard" />
            </button>
            <div>
              <div className="topbar-label">Pinterest Control</div>
              <h1>Collection Dashboard</h1>
            </div>
          </div>

          <div className="topbar-actions">
            <span className="live-pill">Live generation</span>
            <button
              className="theme-toggle"
              type="button"
              onClick={switchTheme}
              aria-label={`Attiva tema ${theme === "dark" ? "chiaro" : "scuro"}`}
            >
              <Glyph name="theme" />
              <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            </button>
            <div className="wordmark">ISAIA</div>
          </div>
        </header>

        <section className="hero-card">
          <div className="hero-copy">
            <h2>Dashboard</h2>
            <p>
              Overview del flusso che legge SharePoint, seleziona un solo frame per
              look, pubblica le immagini su Vercel Blob e costruisce il CSV pronto per
              Pinterest.
            </p>

            <div className="hero-tags">
              <span className="pill">SharePoint live</span>
              <span className="pill">Blob public URLs</span>
              <span className="pill">Pinterest CSV export</span>
            </div>
          </div>

          <div className="hero-actions">
            <button className="ghost-button" type="button" onClick={generateCsv} disabled={loading}>
              <Glyph name="refresh" />
              <span>{loading ? "Running..." : "Generate now"}</span>
            </button>
            <button className="ghost-button" type="button">
              <Glyph name="spark" />
              <span>Operational view</span>
            </button>
          </div>
        </section>

        <section className="metric-grid">
          {stats.map((stat) => (
            <article className="metric-card" key={stat.label}>
              <div className="metric-topline">{stat.eyebrow}</div>
              <div className="metric-value">{stat.value}</div>
              <div className="metric-label">{stat.label}</div>
              <div className="metric-note">{stat.note}</div>
            </article>
          ))}
        </section>

        <section className="content-grid">
          <article className="panel panel-feature">
            <div className="panel-header">
              <div>
                <h3>Generate CSV</h3>
                <p>
                  Inserisci un sotto-percorso opzionale oppure usa una scorciatoia. Se
                  lasci vuoto, il job scansiona tutta la cartella base.
                </p>
              </div>
              <span className="panel-chip">On demand</span>
            </div>

            <div className="quick-paths">
              {quickPaths.map((pathItem) => (
                <button
                  key={pathItem.label}
                  className={`quick-path ${
                    subPath === pathItem.value ? "selected" : ""
                  }`}
                  type="button"
                  onClick={() => setSubPath(pathItem.value)}
                >
                  {pathItem.label}
                </button>
              ))}
            </div>

            <form className="generator-form" onSubmit={handleSubmit}>
              <label className="field-label" htmlFor="subPath">
                Collection path
              </label>
              <div className="input-row">
                <input
                  id="subPath"
                  className="dashboard-input"
                  name="subPath"
                  type="text"
                  value={subPath}
                  onChange={(event) => setSubPath(event.target.value)}
                  placeholder="es. SS26/Lookbook"
                  autoComplete="off"
                />
                <button className="primary-button" type="submit" disabled={loading}>
                  {loading ? "Generazione..." : "Run export"}
                </button>
              </div>
              <p className="input-helper">
                Scope base fisso: <code>Shared Folder/02_Collezioni</code>. Su Vercel va
                lanciato per sotto-percorso.
              </p>
            </form>

            {error ? <div className="notice error">{error}</div> : null}

            {result ? (
              <div className="notice success">
                <div className="result-summary">
                  <div>
                    CSV generato da <strong>{result.sourcePath}</strong>
                  </div>
                  <div>{result.generatedCount} pin pronti all&apos;import</div>
                </div>
                <div className="result-actions">
                  <a href={result.csvDownloadUrl} target="_blank" rel="noreferrer">
                    Scarica CSV
                  </a>
                  <a href={result.csvUrl} target="_blank" rel="noreferrer">
                    Apri file pubblico
                  </a>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-orb" />
                <div>
                  <strong>Nessun export eseguito in questa sessione.</strong>
                  <p>Lancia il job per vedere conteggi, CSV e link pubblico.</p>
                </div>
              </div>
            )}
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <h3>Pipeline rules</h3>
                <p>Le regole applicate al file naming e alla costruzione del CSV.</p>
              </div>
              <span className="panel-chip subtle">Live rules</span>
            </div>

            <div className="rule-stack">
              <div className="rule-card">
                <strong>Collection parsing</strong>
                <p>Livello 4 per stagione, livello 5 per asset type, livello 6 per board.</p>
              </div>
              <div className="rule-card">
                <strong>Look deduplication</strong>
                <p>Per ogni LOOK resta solo il frame con numero finale piu basso.</p>
              </div>
              <div className="rule-card">
                <strong>Media publishing</strong>
                <p>Le immagini selezionate vengono caricate su Vercel Blob con URL pubblici.</p>
              </div>
              <div className="rule-card">
                <strong>Description shaping</strong>
                <p>SS e FW vengono espanse in Spring Summer e Fall Winter con il numero stagione.</p>
              </div>
            </div>
          </article>
        </section>

        <section className="bottom-grid">
          <article className="panel">
            <div className="panel-header compact">
              <div>
                <h3>Execution snapshot</h3>
                <p>Riassunto operativo pronto per verifica rapida.</p>
              </div>
            </div>

            <div className="snapshot-grid">
              <div className="snapshot-item">
                <span>Source folder</span>
                <strong>{result?.sourcePath ?? "Shared Folder/02_Collezioni"}</strong>
              </div>
              <div className="snapshot-item">
                <span>Theme mode</span>
                <strong>{theme === "dark" ? "Dark dashboard" : "Light dashboard"}</strong>
              </div>
              <div className="snapshot-item">
                <span>Thumbnail</span>
                <strong>blank</strong>
              </div>
              <div className="snapshot-item">
                <span>Destination</span>
                <strong>Pinterest import CSV</strong>
              </div>
            </div>
          </article>

          <article className="panel">
            <div className="panel-header compact">
              <div>
                <h3>Operational notes</h3>
                <p>Controlli veloci prima dell&apos;upload su Pinterest.</p>
              </div>
            </div>

            <ul className="checklist">
              <li>Verifica che il path inizi sempre da SharePoint `branding`.</li>
              <li>Controlla che i file look abbiano naming coerente con `LOOKx_###`.</li>
              <li>Usa la stessa stagione per board, title e description.</li>
              <li>Scarica il CSV generato solo dopo che i conteggi risultano plausibili.</li>
            </ul>
          </article>
        </section>
      </div>
    </main>
  );
}
