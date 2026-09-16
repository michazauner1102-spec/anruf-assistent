"use client";

import { useState } from "react";
import { settingsFuerRequest, type Settings } from "@/lib/settings";
import { leseStrom } from "@/lib/streamClient";
import { CopyButton } from "./CopyButton";
import { WebsiteImport } from "./WebsiteImport";

export function NotesPanel({
  notizen,
  onNotizenChange,
  briefing,
  onBriefingChange,
  kontext,
  settings,
}: {
  notizen: string;
  onNotizenChange: (wert: string) => void;
  briefing: string;
  onBriefingChange: (wert: string) => void;
  kontext: string;
  settings: Partial<Settings>;
}) {
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const auswerten = async () => {
    if (laedt || notizen.trim().length < 40) return;
    setLaedt(true);
    setFehler(null);
    onBriefingChange("");
    try {
      const { text, fehler: f } = await leseStrom(
        "/api/briefing",
        { notes: notizen, kontext, settings: settingsFuerRequest(settings) },
        onBriefingChange,
      );
      if (f) setFehler(f);
      else onBriefingChange(text.trim());
    } catch {
      setFehler("Verbindung zur App unterbrochen.");
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

      <WebsiteImport
        zweck="gegenueber"
        aktuell={notizen}
        onErgebnis={onNotizenChange}
        settings={settings}
        platzhalter="Website der Firma, z. B. beispiel-gmbh.de"
      />

      <textarea
        className="input textarea"
        value={notizen}
        rows={8}
        placeholder="Notizen zur Firma einfügen — Recherche, Auffälligkeiten, Gesprächsaufhänger."
        onChange={(e) => onNotizenChange(e.target.value)}
      />

      <div className="frage-row">
        <button
          type="button"
          className="btn btn--info"
          onClick={() => void auswerten()}
          disabled={laedt || notizen.trim().length < 40}
        >
          {laedt ? "wertet aus …" : "Notizen auswerten"}
        </button>
        {briefing && !laedt && <CopyButton text={briefing} label="Briefing kopieren" />}
      </div>

      {fehler && <p className="empty">{fehler}</p>}

      {(laedt || briefing) && (
        <div className="card card--model">
          <span className="card__label">Auswertung — geht als Kontext ins Gespräch mit</span>
          {laedt && !briefing ? (
            <div className="loading">
              <span className="spinner" aria-hidden="true" />
              <span>liest die Notizen …</span>
            </div>
          ) : (
            <pre className="mitschnitt" style={{ margin: 0, border: "none", padding: 0 }}>
              {briefing}
            </pre>
          )}
        </div>
      )}

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
