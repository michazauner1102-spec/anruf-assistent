"use client";

import { useState } from "react";
import { STEPS } from "@/data/script";
import { parseScript, scriptToText } from "@/lib/scriptParser";
import { settingsFuerRequest, type Settings } from "@/lib/settings";
import { leseStrom } from "@/lib/streamClient";
import { FileButton } from "./FileButton";

export function ScriptPanel({
  skript,
  onSkriptChange,
  angepasst,
  onAngepasstChange,
  briefing,
  notizen,
  settings,
}: {
  skript: string;
  onSkriptChange: (wert: string) => void;
  angepasst: string;
  onAngepasstChange: (wert: string) => void;
  briefing: string;
  notizen: string;
  settings: Partial<Settings>;
}) {
  const [vorschlag, setVorschlag] = useState("");
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const basisText = skript.trim() || scriptToText(STEPS);
  const basisSchritte = parseScript(basisText).length;
  const eigenesGesetzt = skript.trim().length > 0;
  const rechercheDa = briefing.trim().length >= 20 || notizen.trim().length >= 40;

  const anpassen = async () => {
    if (laedt || !rechercheDa) return;
    setLaedt(true);
    setFehler(null);
    setVorschlag("");
    try {
      const { text, fehler: f } = await leseStrom(
        "/api/script-adapt",
        { skript: basisText, briefing, notes: notizen, settings: settingsFuerRequest(settings) },
        setVorschlag,
      );
      if (f) setFehler(f);
      else setVorschlag(text.trim());
    } catch {
      setFehler("Verbindung zur App unterbrochen.");
    } finally {
      setLaedt(false);
    }
  };

  const vorschlagSchritte = vorschlag.trim() ? parseScript(vorschlag).length : 0;

  return (
    <div className="panel">
      <p className="panel__hinweis">
        <code>#</code> beginnt einen Schritt, <code>&gt;</code> ist ein Hinweis, alles andere
        ist ein gesprochener Satz. Text in <code>[eckigen Klammern]</code> wird hervorgehoben —{" "}
        <code>[Name]</code>, <code>[Vorname]</code> und <code>[Nachname]</code> füllt das Tool
        mit dem Gesprächspartner aus den Notizen.
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
        rows={14}
        spellCheck={false}
        placeholder={
          "# Opener\nGuten Tag, [Vorname], hier …\n> Pause. Antwort abwarten.\n\n# Qualifizierung\nWie viele Anfragen bekommen Sie pro Woche?"
        }
        onChange={(e) => onSkriptChange(e.target.value)}
      />

      <div className="panel__fuss">
        <span>
          {eigenesGesetzt
            ? `${basisSchritte} Schritte — eigenes Basis-Skript`
            : `${basisSchritte} Schritte — mitgeliefertes Basis-Skript`}
        </span>
        {eigenesGesetzt && (
          <button type="button" className="link-btn" onClick={() => onSkriptChange("")}>
            Zurücksetzen
          </button>
        )}
      </div>

      <div className="panel__trenner" />

      <p className="panel__hinweis">
        Aus der Recherche im Notizbereich wird ein Vorschlag, der ein bis zwei Stellen des
        Skripts auf diesen Gesprächspartner zuschneidet. Das Basis-Skript oben bleibt dabei
        unverändert.
      </p>

      <div className="frage-row">
        <button
          type="button"
          className="btn btn--info"
          onClick={() => void anpassen()}
          disabled={laedt || !rechercheDa}
        >
          {laedt ? "passt an …" : "An diesen Gesprächspartner anpassen"}
        </button>
      </div>

      {!rechercheDa && (
        <p className="empty">Dafür erst im Notizbereich Recherche einfügen und auswerten.</p>
      )}
      {fehler && <p className="empty">{fehler}</p>}

      {angepasst.trim() && !vorschlag && (
        <div className="card card--model">
          <span className="card__label">
            Angepasste Fassung aktiv · {parseScript(angepasst).length} Schritte — Basis unverändert
          </span>
          <pre className="mitschnitt" style={{ margin: 0, border: "none", padding: 0 }}>
            {angepasst}
          </pre>
          <div className="frage-row" style={{ marginBottom: 0 }}>
            <button type="button" className="btn btn--schmal" onClick={() => onAngepasstChange("")}>
              Zurück zur Basis
            </button>
          </div>
        </div>
      )}

      {(laedt || vorschlag) && (
        <div className="card card--model">
          <span className="card__label">
            Vorschlag{vorschlagSchritte > 0 ? ` · ${vorschlagSchritte} Schritte` : ""}
          </span>
          {laedt && !vorschlag ? (
            <div className="loading">
              <span className="spinner" aria-hidden="true" />
              <span>schneidet das Skript zu …</span>
            </div>
          ) : (
            <textarea
              className="input textarea"
              value={vorschlag}
              rows={12}
              spellCheck={false}
              onChange={(e) => setVorschlag(e.target.value)}
            />
          )}
          {!laedt && vorschlag && (
            <div className="frage-row" style={{ marginBottom: 0 }}>
              <button
                type="button"
                className="btn btn--go"
                onClick={() => {
                  onAngepasstChange(vorschlag.trim());
                  setVorschlag("");
                }}
              >
                Übernehmen
              </button>
              <button
                type="button"
                className="btn btn--schmal"
                onClick={() => setVorschlag("")}
              >
                Verwerfen
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
