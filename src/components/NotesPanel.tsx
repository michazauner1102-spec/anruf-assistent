"use client";

import type { Settings } from "@/lib/settings";
import { WebsiteImport } from "./WebsiteImport";

export function NotesPanel({
  notizen,
  onNotizenChange,
  settings,
}: {
  notizen: string;
  onNotizenChange: (wert: string) => void;
  settings: Partial<Settings>;
}) {
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
        platzhalter="Website der Firma, z. B. makler-mustermann.de"
      />

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
