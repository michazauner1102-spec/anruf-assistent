"use client";

import { useRef, useState } from "react";
import { STEPS } from "@/data/script";
import { parseScript, scriptToText } from "@/lib/scriptParser";
import type { Settings } from "@/lib/settings";
import { WebsiteImport } from "./WebsiteImport";

function DateiKnopf({ onText, label }: { onText: (text: string) => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" className="btn btn--schmal" onClick={() => ref.current?.click()}>
        {label}
      </button>
      <input
        ref={ref}
        type="file"
        accept=".txt,.md,.markdown,text/plain"
        hidden
        onChange={async (e) => {
          const datei = e.target.files?.[0];
          if (!datei) return;
          onText(await datei.text());
          // Zuruecksetzen, damit dieselbe Datei erneut gewaehlt werden kann.
          e.target.value = "";
        }}
      />
    </>
  );
}

export function ContextPanel({
  kontext,
  onKontextChange,
  skript,
  onSkriptChange,
  settings,
}: {
  kontext: string;
  onKontextChange: (wert: string) => void;
  skript: string;
  onSkriptChange: (wert: string) => void;
  settings: Partial<Settings>;
}) {
  const [zeigeSkript, setZeigeSkript] = useState(false);
  const erkannteSchritte = skript.trim() ? parseScript(skript).length : 0;

  return (
    <div className="panel">
      <div className="panel__kopf">
        <button
          type="button"
          className="link-btn"
          aria-pressed={!zeigeSkript}
          onClick={() => setZeigeSkript(false)}
        >
          Eigener Kontext
        </button>
        <button
          type="button"
          className="link-btn"
          aria-pressed={zeigeSkript}
          onClick={() => setZeigeSkript(true)}
        >
          Eigenes Skript{erkannteSchritte > 0 ? ` (${erkannteSchritte})` : ""}
        </button>
      </div>

      {!zeigeSkript ? (
        <>
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
            <DateiKnopf label="Datei laden" onText={onKontextChange} />
          </div>
          <textarea
            className="input textarea"
            value={kontext}
            rows={8}
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
        </>
      ) : (
        <>
          <p className="panel__hinweis">
            Ersetzt den Gesprächsablauf links. Format: <code>#</code> beginnt einen Schritt,
            <code>&gt;</code> ist ein Hinweis, alles andere ist ein gesprochener Satz. Text in{" "}
            <code>[eckigen Klammern]</code> wird als Einsetzstelle hervorgehoben.
          </p>
          <div className="frage-row">
            <DateiKnopf label="Datei laden" onText={onSkriptChange} />
            <button
              type="button"
              className="btn btn--schmal"
              onClick={() => onSkriptChange(scriptToText(STEPS))}
            >
              Mitgeliefertes übernehmen
            </button>
          </div>
          <textarea
            className="input textarea"
            value={skript}
            rows={12}
            spellCheck={false}
            placeholder={"# Opener\nGuten Tag, [Name], hier …\n> Pause. Antwort abwarten.\n\n# Qualifizierung\nWie viele Anfragen bekommen Sie pro Woche?"}
            onChange={(e) => onSkriptChange(e.target.value)}
          />
          <div className="panel__fuss">
            <span>
              {erkannteSchritte > 0
                ? `${erkannteSchritte} Schritte erkannt — wird verwendet`
                : "leer — es gilt das mitgelieferte Skript"}
            </span>
            {skript && (
              <button type="button" className="link-btn" onClick={() => onSkriptChange("")}>
                Zurücksetzen
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
