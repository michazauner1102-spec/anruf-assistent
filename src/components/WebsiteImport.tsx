"use client";

import { useState } from "react";
import { settingsFuerRequest, type Settings } from "@/lib/settings";

/**
 * Liest eine Website aus und haengt die Zusammenfassung an ein Textfeld an.
 * "zweck" entscheidet, worauf das Modell beim Zusammenfassen achtet: beim
 * Gegenueber auf Anhaltspunkte fuers Gespraech, beim eigenen Angebot auf
 * Leistungen und Abgrenzung.
 */
export function WebsiteImport({
  zweck,
  aktuell,
  onErgebnis,
  settings,
  platzhalter,
}: {
  zweck: "gegenueber" | "eigen";
  aktuell: string;
  onErgebnis: (text: string) => void;
  settings: Partial<Settings>;
  platzhalter: string;
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
        body: JSON.stringify({
          url: url.trim(),
          zweck,
          settings: settingsFuerRequest(settings),
        }),
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
      onErgebnis(
        aktuell.trim() ? `${aktuell.trim()}\n\n${kopf}\n${daten.notes}` : `${kopf}\n${daten.notes}`,
      );
      setMeldung(daten.hinweis ?? "Übernommen.");
      setUrl("");
    } catch {
      setMeldung("Auslesen fehlgeschlagen.");
    } finally {
      setLaedt(false);
    }
  };

  return (
    <>
      <div className="frage-row">
        <input
          className="input"
          type="url"
          value={url}
          placeholder={platzhalter}
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
    </>
  );
}
