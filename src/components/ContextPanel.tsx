"use client";

import type { Settings } from "@/lib/settings";
import { FileButton } from "./FileButton";
import { WebsiteImport } from "./WebsiteImport";

export function ContextPanel({
  kontext,
  onKontextChange,
  settings,
}: {
  kontext: string;
  onKontextChange: (wert: string) => void;
  settings: Partial<Settings>;
}) {
  return (
    <div className="panel">
      <p className="panel__hinweis">
        Angaben zum eigenen Angebot: Leistungen, Preise, Abgrenzung zum Wettbewerb,
        Formulierungen, die funktionieren. Eigene Website auslesen, Datei laden oder
        einfügen. Geht als Hintergrundwissen ins Modell und hat Vorrang vor den
        Standardangaben.
      </p>

      <WebsiteImport
        zweck="eigen"
        aktuell={kontext}
        onErgebnis={onKontextChange}
        settings={settings}
        platzhalter="Eigene Website, z. B. ihre-firma.de/leistungen"
      />

      <div className="frage-row">
        <FileButton label="Datei laden" onText={onKontextChange} />
      </div>

      <textarea
        className="input textarea"
        value={kontext}
        rows={10}
        placeholder="z. B. Leistungsumfang, Preisstaffel, was Sie bewusst nicht anbieten …"
        onChange={(e) => onKontextChange(e.target.value)}
      />

      <div className="panel__fuss">
        <span>{kontext.length} Zeichen</span>
        {kontext && (
          <button type="button" className="link-btn" onClick={() => onKontextChange("")}>
            Leeren
          </button>
        )}
      </div>
    </div>
  );
}
