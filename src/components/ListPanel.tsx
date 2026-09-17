"use client";

import { useRef, useState } from "react";
import { parseListe, type Kontakt, type Liste } from "@/lib/liste";
import { anredeAus, ansprechpartnerAus, type Anrede } from "@/lib/platzhalter";
import { settingsFuerRequest, type Settings } from "@/lib/settings";
import { skriptAnpassen } from "@/lib/skriptAnpassen";
import { leseStrom } from "@/lib/streamClient";
import { FileButton } from "./FileButton";

export function ListPanel({
  liste,
  onAktiv,
  onAendern,
  onErgaenzen,
  onEntfernen,
  onLeeren,
  basisSkript,
  settings,
}: {
  liste: Liste;
  onAktiv: (id: string) => void;
  onAendern: (id: string, teil: Partial<Kontakt>) => void;
  onErgaenzen: (neue: Kontakt[]) => void;
  onEntfernen: (id: string) => void;
  onLeeren: () => void;
  basisSkript: string;
  settings: Partial<Settings>;
}) {
  const [eingabe, setEingabe] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [fortschritt, setFortschritt] = useState("");
  const [mitSkript, setMitSkript] = useState(false);
  const abbruchRef = useRef(false);

  const offen = liste.kontakte.filter((k) => !k.ergebnis).length;
  const ohneBriefing = liste.kontakte.filter((k) => !k.briefing && (k.url || k.notizen));

  const hinzufuegen = (text: string) => {
    const neue = parseListe(text);
    if (neue.length === 0) return;
    onErgaenzen(neue);
    setEingabe("");
  };

  /** Recherche fuer alle offenen Eintraege, nacheinander und abbrechbar. */
  const alleRecherchieren = async () => {
    if (laeuft) return;
    abbruchRef.current = false;
    setLaeuft(true);

    try {
      for (let i = 0; i < ohneBriefing.length; i++) {
        if (abbruchRef.current) break;
        const kontakt = ohneBriefing[i];
        setFortschritt(`${i + 1} von ${ohneBriefing.length}: ${kontakt.firma || kontakt.url}`);

        let notizen = kontakt.notizen;

        // 1. Website auslesen, falls eine Adresse hinterlegt ist
        if (kontakt.url && !notizen.trim()) {
          try {
            const res = await fetch("/api/research", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                url: kontakt.url,
                zweck: "gegenueber",
                settings: settingsFuerRequest(settings),
              }),
            });
            const daten = (await res.json()) as { notes?: string; quelle?: string };
            if (daten.notes) {
              notizen = `— ${daten.quelle ?? kontakt.url} —\n${daten.notes}`;
              onAendern(kontakt.id, { notizen });
            }
          } catch {
            // Einzelne Seite nicht erreichbar — der Rest der Liste laeuft weiter.
          }
        }

        if (abbruchRef.current || notizen.trim().length < 40) continue;

        // 2. Briefing daraus verdichten
        const { text: briefing } = await leseStrom(
          "/api/briefing",
          { notes: notizen, settings: settingsFuerRequest(settings) },
          () => {},
        );
        if (!briefing.trim()) continue;

        const name = ansprechpartnerAus(briefing);
        const anrede = anredeAus(briefing);
        onAendern(kontakt.id, {
          briefing: briefing.trim(),
          ...(name ? { name } : {}),
          ...(anrede ? { anrede: anrede as Anrede } : {}),
        });

        if (abbruchRef.current || !mitSkript || !basisSkript.trim()) continue;

        // 3. Optional das Skript gleich zuschneiden
        const { text: skript } = await skriptAnpassen({
          basisText: basisSkript,
          briefing,
          notizen,
          modus: "zuschnitt",
          settings,
        });
        if (skript.trim()) onAendern(kontakt.id, { skriptAngepasst: skript.trim() });
      }
    } finally {
      setLaeuft(false);
      setFortschritt("");
    }
  };

  return (
    <div className="panel">
      <p className="panel__hinweis">
        Eine Zeile je Firma. Getrennt mit Tabulator, Semikolon oder senkrechtem Strich —
        Einfügen aus einer Tabelle funktioniert direkt. Die Adresse wird am Inhalt erkannt,
        die Reihenfolge der Felder ist egal.
      </p>

      <textarea
        className="input textarea"
        value={eingabe}
        rows={4}
        spellCheck={false}
        placeholder={"Immobilien Bergmann; Thomas Bergmann; bergmann-immobilien.de\nKellermann GmbH; ; kellermann-immo.de\nimmo-schwalm-eder.de"}
        onChange={(e) => setEingabe(e.target.value)}
      />

      <div className="frage-row">
        <button
          type="button"
          className="btn btn--info"
          onClick={() => hinzufuegen(eingabe)}
          disabled={eingabe.trim() === ""}
        >
          Zur Liste hinzufügen
        </button>
        <FileButton label="CSV laden" onText={hinzufuegen} />
      </div>

      {liste.kontakte.length > 0 && (
        <>
          <div className="panel__trenner" />

          <div className="frage-row">
            <button
              type="button"
              className="btn"
              onClick={() => (laeuft ? (abbruchRef.current = true) : void alleRecherchieren())}
              disabled={!laeuft && ohneBriefing.length === 0}
            >
              {laeuft
                ? "Abbrechen"
                : ohneBriefing.length === 0
                  ? "Alles recherchiert"
                  : `${ohneBriefing.length} recherchieren`}
            </button>
            <label className="check" style={{ minHeight: 0 }}>
              <input
                type="checkbox"
                checked={mitSkript}
                onChange={() => setMitSkript((v) => !v)}
                disabled={laeuft}
              />
              <span>Skript gleich zuschneiden (dauert deutlich länger)</span>
            </label>
          </div>

          {fortschritt && <p className="empty">{fortschritt}</p>}

          <div className="kontaktliste">
            {liste.kontakte.map((k) => (
              <div
                key={k.id}
                className={k.id === liste.aktivId ? "kontakt kontakt--aktiv" : "kontakt"}
              >
                <button type="button" className="kontakt__name" onClick={() => onAktiv(k.id)}>
                  <span>{k.firma || k.url || "ohne Namen"}</span>
                  <span className="kontakt__meta">
                    {k.name || "—"}
                    {k.briefing ? " · recherchiert" : ""}
                    {k.skriptAngepasst ? " · Skript" : ""}
                    {k.ergebnis ? ` · ${k.ergebnis}` : ""}
                  </span>
                </button>
                <button
                  type="button"
                  className="link-btn"
                  aria-label={`${k.firma || "Eintrag"} entfernen`}
                  onClick={() => onEntfernen(k.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="panel__fuss">
            <span>
              {liste.kontakte.length} Einträge · {offen} offen
            </span>
            <button type="button" className="link-btn" onClick={onLeeren}>
              Liste leeren
            </button>
          </div>
        </>
      )}
    </div>
  );
}
