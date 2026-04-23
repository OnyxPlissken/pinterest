"use client";

import { useEffect, useState } from "react";

function LoginGlyph({ name }) {
  const glyphs = {
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
    moon: (
      <path
        d="M15.4 4.8a7 7 0 1 0 3.8 10.4 6.5 6.5 0 0 1-3.8-10.4Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    ),
    lock: (
      <path
        d="M8 10V8.3a4 4 0 1 1 8 0V10M6.7 10h10.6c.7 0 1.2.5 1.2 1.2v7c0 .7-.5 1.3-1.2 1.3H6.7c-.7 0-1.2-.6-1.2-1.3v-7c0-.7.5-1.2 1.2-1.2Z"
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
      {glyphs[name]}
    </svg>
  );
}

export default function LoginPage() {
  const [theme, setTheme] = useState("dark");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

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

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setNotice(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username,
          password
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Accesso non riuscito.");
      }

      window.location.assign("/");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Accesso non riuscito.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-frame">
        <div className="auth-panel">
          <div className="auth-copy">
            <span className="tag">Area riservata</span>
            <h1>Accedi alla dashboard</h1>
          </div>

          <div className="auth-brand">
            <div className="brand-mark">I</div>
            <div>
              <div className="brand-title">ISAIA e ISAIA</div>
              <div className="brand-subtitle">Pinterest Assets Management</div>
            </div>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-card-head">
            <div className="live-badge">
              <LoginGlyph name="lock" />
              <span>Login</span>
            </div>
            <button className="icon-button" type="button" onClick={switchTheme}>
              <LoginGlyph name={theme === "dark" ? "sun" : "moon"} />
              <span>{theme === "dark" ? "Tema chiaro" : "Tema scuro"}</span>
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Username</span>
              <input
                className="select-field"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                placeholder="Inserisci username"
                required
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                className="select-field"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="Inserisci password"
                required
              />
            </label>

            {notice ? <div className="notice error">{notice}</div> : null}

            <button className="primary-button auth-submit" type="submit" disabled={loading}>
              <span>{loading ? "Accesso..." : "Accedi"}</span>
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
