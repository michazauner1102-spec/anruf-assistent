"use client";

import { useState } from "react";
import { settingsFuerRequest, type Settings } from "@/lib/settings";
import { anredeAus, ansprechpartnerAus, type Anrede } from "@/lib/platzhalter";
import { geaenderteZeilen, skriptAnpassen } from "@/lib/skriptAnpassen";
import { leseStrom } from "@/lib/streamClient";
import { CopyButton } from "./CopyButton";
import { WebsiteImport } from "./WebsiteImport";

export function NotesPanel({
  notizen,
  onNotizenChange,
  briefing,
  onBriefingChange,
  kontakt,
  onKontaktChange,
  anrede,
  onAnredeChange,
  kontext,
  basisSkript,
  onAngepasstChange,
  onZumSkript,
  settings,
}: {
  notizen: string;
  onNotizenChange: (wert: string) => void;
  briefing: string;
  onBriefingChange: (wert: string) => void;
  kontakt: string;
  onKontaktChange: (wert: string) => void;
  anrede: Anrede;
  onAnredeChange: (wert: Anrede) => void;
  kontext: string;
  basisSkript: string;
  onAngepasstChange: (wert: string) => void;
  onZumSkript: () => void;
  settings: Partial<Settings>;
}) {
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [skriptLaedt, setSkriptLaedt] = useState(false);
  const [skriptErgebnis, setSkriptErgebnis] = useState<{ text: string; geaendert: string[] } | null>(
    null,
  );
  const [ganzesSkript, setGanzesSkript] = useState(false);

  const genugNotizen = notizen.trim().length >= 40;

  // Direkt von hier aus: nimmt das hinterlegte Skript und schneidet es zu,
  // ohne den Umweg über den Skript-Bereich.
  const skriptZuschneiden = async () => {
    if (skriptLaedt || !genugNotizen) return;
    setSkriptLaedt(true);
    setFehler(null);
    setSkriptErgebnis(null);
    setGanzesSkript(false);
    try {
      const { text, fehler: f } = await skriptAnpassen({
        basisText: basisSkript,
        briefing,
        notizen,
        modus: "zuschnitt",
        settings,
      });
      if (f || !text) {
        setFehler(f ?? "Das Modell hat nicht geantwortet.");
        return;
      }
      onAngepasstChange(text);
      setSkriptErgebnis({ text, geaendert: geaenderteZeilen(basisSkript, text) });
    } catch {
      setFehler("Verbindung zur App unterbrochen.");
    } finally {
      setSkriptLaedt(false);
    }
  };

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
      if (f) {
        setFehler(f);
        return;
      }
      const fertig = text.trim();
      onBriefingChange(fertig);
      // Nennt die Auswertung einen Ansprechpartner, wandert er direkt ins Skript.
      const gefunden = ansprechpartnerAus(fertig);
      if (gefunden) onKontaktChange(gefunden);
      const angeredet = anredeAus(fertig);
      if (angeredet) onAnredeChange(angeredet);
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

      <label className="feld">
        <span>Gesprächspartner — füllt [Name], [Vorname] und [Nachname] im Skript</span>
        <input
          className="input"
          type="text"
          value={kontakt}
          autoComplete="off"
          placeholder="wird aus der Auswertung übernommen, überschreibbar"
          onChange={(e) => onKontaktChange(e.target.value)}
        />
      </label>

      <div className="variants">
        {(["Herr", "Frau", ""] as Anrede[]).map((wert) => (
          <button
            key={wert || "offen"}
            type="button"
            className="variant"
            aria-pressed={anrede === wert}
            onClick={() => onAnredeChange(wert)}
          >
            {wert || "offen lassen"}
          </button>
        ))}
      </div>
      <p className="panel__hinweis">
        Ersetzt {"\u201e"}Frau/Herr{"\u201c"} und <code>[Anrede]</code> im Skript. Die Auswertung schlägt das
        nur vor, wenn es in den Notizen steht — aus dem Vornamen wird nicht geraten.
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
          disabled={laedt || !genugNotizen}
        >
          {laedt ? "wertet aus …" : "Notizen auswerten"}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => void skriptZuschneiden()}
          disabled={skriptLaedt || !genugNotizen}
        >
          {skriptLaedt ? "passt an …" : "Skript anpassen"}
        </button>
        {briefing && !laedt && <CopyButton text={briefing} label="Briefing kopieren" />}
      </div>

      {skriptErgebnis && (
        <div className="card card--model">
          <span className="card__label">
            Skript angepasst ·{" "}
            {skriptErgebnis.geaendert.length === 0
              ? "nichts geändert, es passte nichts"
              : `${skriptErgebnis.geaendert.length} Zeile${skriptErgebnis.geaendert.length === 1 ? "" : "n"} geändert`}
          </span>

          {!ganzesSkript &&
            skriptErgebnis.geaendert.map((zeile) => (
              <p key={zeile} className="speech">
                {zeile}
              </p>
            ))}

          {ganzesSkript && (
            <textarea
              className="input textarea"
              value={skriptErgebnis.text}
              rows={14}
              spellCheck={false}
              onChange={(e) => {
                const text = e.target.value;
                setSkriptErgebnis({ text, geaendert: geaenderteZeilen(basisSkript, text) });
                onAngepasstChange(text);
              }}
            />
          )}

          <div className="frage-row" style={{ marginBottom: 0 }}>
            <button
              type="button"
              className="btn btn--schmal"
              onClick={() => setGanzesSkript((offen) => !offen)}
            >
              {ganzesSkript ? "Nur Änderungen zeigen" : "Ganzes Skript anzeigen"}
            </button>
            <button type="button" className="btn btn--schmal" onClick={onZumSkript}>
              Im Skript-Bereich öffnen
            </button>
            <button
              type="button"
              className="btn btn--schmal"
              onClick={() => {
                onAngepasstChange("");
                setSkriptErgebnis(null);
                setGanzesSkript(false);
              }}
            >
              Rückgängig
            </button>
          </div>
        </div>
      )}

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
