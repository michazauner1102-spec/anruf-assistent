"use client";

import { useState } from "react";
import type { Settings } from "@/lib/settings";
import { settingsFuerRequest } from "@/lib/settings";

export function NotesPanel({
  notizen,
  onNotizenChange,
  settings,
}: {
  notizen: string;
  onNotizenChange: (wert: string) => void;
  settings: Partial<Settings>;
}) {
  const [url, setUrl] = useState("");
  const [laedt, setLaedt] = useState(false);
  const [meldung, setMeldung] = useState<string | null>(null);

  const auslesen = async () => {
    if (!url.trim() || laedt) return;
    setLaedt(true);
    setMeldung(null);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), settings: settingsFuerRequest(settings) }),
      });
      const daten = (await res.json()) as {
        notes?: string;
        quelle?: string;
        hinweis?: string;
        error?: string;
      };
      if (!res.ok || !daten.notes) {
        setMeldung(daten.error ?? "Auslesen fehlgeschlagen.");
        return;
      }
      const kopf = `— ${daten.quelle ?? url.trim()} —`;
      onNotizenChange(notizen.trim() ? `${notizen.trim()}\n\n${kopf}\n${daten.notes}` : `${kopf}\n${daten.notes}`);
      setMeldung(daten.hinweis ?? "Übernommen.");
      setUrl("");
    } catch {
      setMeldung("Auslesen fehlgeschlagen.");
    } finally {
      setLaedt(false);
    }
  };

  return (
    <div className="panel">
      <p className="panel__hinweis">
        Was Sie hier eintragen, bekommt das Modell als Hintergrundwissen — nur für dieses
        Gespräch, gespeichert bleibt es allein in diesem Browser.
      </p>

      <div className="frage-row">
        <input
          className="input"
          type="url"
          value={url}
          placeholder="Website der Firma, z. B. makler-mustermann.de"
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void auslesen();
            }
          }}
        />
        <button
          type="button"
          className="btn btn--schmal"
          onClick={() => void auslesen()}
          disabled={laedt || url.trim() === ""}
        >
          {laedt ? "liest …" : "Website auslesen"}
        </button>
      </div>

      {meldung && <p className="panel__hinweis">{meldung}</p>}

      <textarea
        className="input textarea"
        value={notizen}
        rows={8}
        placeholder="Notizen zur Firma einfügen — Recherche, Auffälligkeiten, Gesprächsaufhänger."
        onChange={(e) => onNotizenChange(e.target.value)}
      />

      <div className="panel__fuss">
        <span>{notizen.length} Zeichen</span>
        {notizen && (
          <button type="button" className="link-btn" onClick={() => onNotizenChange("")}>
            Leeren
          </button>
        )}
      </div>
    </div>
  );
}
