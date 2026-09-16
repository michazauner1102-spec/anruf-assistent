"use client";

import { STEPS } from "@/data/script";
import { parseScript, scriptToText } from "@/lib/scriptParser";
import { FileButton } from "./FileButton";

export function ScriptPanel({
  skript,
  onSkriptChange,
}: {
  skript: string;
  onSkriptChange: (wert: string) => void;
}) {
  const erkannteSchritte = skript.trim() ? parseScript(skript).length : 0;

  return (
    <div className="panel">
      <p className="panel__hinweis">
        Ersetzt den Gesprächsablauf links. <code>#</code> beginnt einen Schritt,{" "}
        <code>&gt;</code> ist ein Hinweis, alles andere ist ein gesprochener Satz. Text in{" "}
        <code>[eckigen Klammern]</code> wird als Einsetzstelle hervorgehoben — für{" "}
        <code>[Name]</code>, <code>[Vorname]</code> und <code>[Nachname]</code> setzt das Tool
        den Gesprächspartner aus den Notizen ein.
      </p>

      <div className="frage-row">
        <FileButton label="Datei laden" onText={onSkriptChange} />
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
        rows={16}
        spellCheck={false}
        placeholder={
          "# Opener\nGuten Tag, [Vorname], hier …\n> Pause. Antwort abwarten.\n\n# Qualifizierung\nWie viele Anfragen bekommen Sie pro Woche?"
        }
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
    </div>
  );
}
