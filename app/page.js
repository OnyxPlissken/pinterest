"use client";

import { useState } from "react";

export default function HomePage() {
  const [subPath, setSubPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
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

  return (
    <main className="page">
      <section className="hero">
        <span className="eyebrow">ISAIA / Pinterest</span>
        <h1 className="title">Generatore CSV da SharePoint</h1>
        <p className="lead">
          L&apos;app legge le immagini presenti in SharePoint sotto{" "}
          <strong>Shared Folder/02_Collezioni</strong>, seleziona una sola immagine per
          look, le pubblica su Vercel Blob e costruisce il CSV pronto da importare su
          Pinterest.
        </p>

        <div className="grid">
          <div className="card">
            <h2>Genera on demand</h2>
            <form onSubmit={handleSubmit}>
              <label className="label" htmlFor="subPath">
                Sotto-percorso opzionale
              </label>
              <input
                id="subPath"
                className="input"
                name="subPath"
                type="text"
                value={subPath}
                onChange={(event) => setSubPath(event.target.value)}
                placeholder="es. SS26/Lookbook"
                autoComplete="off"
              />
              <p className="helper">
                Se lasci vuoto, l&apos;app scandisce tutta la cartella base.
              </p>

              <button className="button" type="submit" disabled={loading}>
                {loading ? "Generazione in corso..." : "Genera CSV Pinterest"}
              </button>
            </form>

            {error ? <div className="status error">{error}</div> : null}

            {result ? (
              <div className="status success">
                <div>
                  CSV generato da <strong>{result.sourcePath}</strong>.
                </div>
                <div>Immagini lette: {result.scannedCount}</div>
                <div>Pin generati: {result.generatedCount}</div>
                <div>File scartati: {result.skippedCount}</div>
                <a className="result-link" href={result.csvDownloadUrl} target="_blank" rel="noreferrer">
                  Scarica CSV
                </a>
              </div>
            ) : null}
          </div>

          <aside className="card">
            <h3>Regole applicate</h3>
            <div className="meta-list">
              <div className="meta-item">
                <strong>Scope fisso</strong>
                <span>Site `branding`, base folder `Shared Folder/02_Collezioni`.</span>
              </div>
              <div className="meta-item">
                <strong>Selezione immagini</strong>
                <span>Una sola immagine per `LOOK`, tenendo il frame numericamente piu basso.</span>
              </div>
              <div className="meta-item">
                <strong>Media URL</strong>
                <span>URL pubblici Vercel Blob, adatti al requisito Pinterest.</span>
              </div>
              <div className="meta-item">
                <strong>Thumbnail</strong>
                <span>Lasciata vuota di default per massima compatibilita con image upload.</span>
              </div>
            </div>
          </aside>
        </div>

        <p className="footnote">
          La route e la UI sono pensate per essere protette con Basic Auth via variabili
          ambiente.
        </p>
      </section>
    </main>
  );
}
