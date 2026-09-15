"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Settings } from "@/lib/settings";
import { settingsFuerRequest } from "@/lib/settings";
import { matchFromSpeech } from "@/lib/search";
import { stripWrappingQuotes } from "@/lib/text";
import { CATEGORY_LABELS, CATEGORY_STRATEGY } from "@/data/objections";
import { useSpeechRecognition } from "./useSpeechRecognition";
import { Speech } from "./ScriptText";

interface StreamEvent {
  delta?: string;
  error?: string;
  done?: boolean;
}

export function LiveListener({
  notizen,
  kontext,
  settings,
}: {
  notizen: string;
  kontext: string;
  settings: Partial<Settings>;
}) {
  const {
    unterstuetzt,
    laeuft,
    letzteAeusserung,
    vorlaeufig,
    fehler,
    verlauf,
    verlaufErgaenzen,
    starten,
    stoppen,
    zuruecksetzen,
  } = useSpeechRecognition();

  const [eingabe, setEingabe] = useState("");
  const [antwort, setAntwort] = useState("");
  const [laedt, setLaedt] = useState(false);
  const [modellFehler, setModellFehler] = useState<string | null>(null);
  const eingabeAktivRef = useRef(false);
  /** Was in dieser Situation schon vorgeschlagen wurde — verhindert Wiederholungen. */
  const [bereits, setBereits] = useState<string[]>([]);
  const letzteFrageRef = useRef("");

  // Entscheidend fuer die Trefferqualitaet: gematcht wird der Satz, der GERADE
  // gesprochen wird — nicht der rollende Gesamtpuffer. Sonst gewinnt ein Einwand
  // von vor 20 Sekunden gegen das, was der Makler eben gesagt hat.
  const aktuellerSatz = vorlaeufig.trim() || letzteAeusserung;
  const treffer = useMemo(() => matchFromSpeech(aktuellerSatz), [aktuellerSatz]);

  // Das zuletzt Gehoerte wandert ins Eingabefeld, solange dort nicht getippt wird —
  // so ist "ans Modell schicken" ein Klick statt Abtippen.
  useEffect(() => {
    if (laeuft && !eingabeAktivRef.current && letzteAeusserung) {
      setEingabe(letzteAeusserung);
    }
  }, [laeuft, letzteAeusserung]);


  const kontextAktiv = notizen.trim().length > 0;

  const fragen = async () => {
    const objection = eingabe.trim();
    if (!objection || laedt) return;

    // Neuer Einwand: die Vorschlagshistorie beginnt von vorn. Die hinterlegte
    // Antwort zaehlt als bereits gezeigt, damit das Modell sie nicht wiederholt.
    const neueFrage = objection !== letzteFrageRef.current;
    const vorherige = neueFrage ? (treffer ? [treffer.objection.answer] : []) : bereits;
    letzteFrageRef.current = objection;

    setLaedt(true);
    setModellFehler(null);
    setAntwort("");

    try {
      const res = await fetch("/api/objection-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objection,
          notes: notizen,
          kontext,
          verlauf,
          bereits: vorherige,
          settings: settingsFuerRequest(settings),
        }),
      });

      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setModellFehler(data.error ?? "Das Modell hat nicht geantwortet.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let puffer = "";
      let gesammelt = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        puffer += decoder.decode(value, { stream: true });
        const zeilen = puffer.split("\n");
        puffer = zeilen.pop() ?? "";
        for (const zeile of zeilen) {
          const t = zeile.trim();
          if (!t) continue;
          let event: StreamEvent;
          try {
            event = JSON.parse(t) as StreamEvent;
          } catch {
            continue;
          }
          if (event.error) setModellFehler(event.error);
          if (typeof event.delta === "string") {
            gesammelt += event.delta;
            setAntwort(gesammelt);
          }
        }
      }

      const fertig = stripWrappingQuotes(gesammelt);
      setAntwort(fertig);
      if (fertig) {
        setBereits([...vorherige, fertig]);
        // Als eigener Zug in den Verlauf — beim naechsten Mal weiss das Modell,
        // worauf der Gespraechspartner gerade reagiert.
        verlaufErgaenzen("micha", fertig);
      }
    } catch {
      setModellFehler("Verbindung zur App unterbrochen.");
    } finally {
      setLaedt(false);
    }
  };

  const hatVorschlag = antwort !== "" || bereits.length > (treffer ? 1 : 0);

  return (
    <section className="live" aria-label="Mithören">
      <div className="mic-row">
        <button
          type="button"
          className={laeuft ? "btn btn--stop" : "btn btn--go"}
          onClick={laeuft ? stoppen : starten}
          disabled={!unterstuetzt}
        >
          {laeuft ? "⏹ Zuhören beenden" : "🎤 Zuhören starten"}
        </button>
        {laeuft && (
          <button
            type="button"
            className="btn btn--schmal"
            onClick={() => {
              zuruecksetzen();
              setAntwort("");
              setModellFehler(null);
            }}
          >
            Leeren
          </button>
        )}
      </div>

      {!unterstuetzt && (
        <p className="privacy">
          Dieser Browser kann keine Spracherkennung — in Chrome öffnen. Das Feld unten
          funktioniert trotzdem.
        </p>
      )}

      {fehler && <p className="empty">{fehler}</p>}

      {laeuft && (
        <p className="transcript">
          <span className="puls" aria-hidden="true" />
          <span className="transcript__text">{aktuellerSatz || "hört zu …"}</span>
        </p>
      )}

      {treffer ? (
        <div className="card card--objection">
          <span className="card__label">
            Erkannt · {CATEGORY_LABELS[treffer.objection.category]} ·{" "}
            {treffer.ausloeser.join(", ")}
          </span>
          <p className="card__title">{treffer.objection.question}</p>
          <Speech text={treffer.objection.answer} big />
          {treffer.objection.ursache && (
            <p className="ursache">Dahinter steckt: {treffer.objection.ursache}</p>
          )}
          {CATEGORY_STRATEGY[treffer.objection.category] && (
            <p className="universal">
              Wenn unklar: {"\u201e"}
              {CATEGORY_STRATEGY[treffer.objection.category]?.universalantwort}
              {"\u201c"}
            </p>
          )}
        </div>
      ) : (
        laeuft && <p className="empty">Kein Einwand erkannt — Sie führen das Gespräch.</p>
      )}

      <div className="frage-row">
        <input
          className="input"
          type="text"
          value={eingabe}
          autoComplete="off"
          placeholder="Einwand eintippen oder Gehörtes ans Modell schicken"
          onFocus={() => {
            eingabeAktivRef.current = true;
          }}
          onBlur={() => {
            eingabeAktivRef.current = false;
          }}
          onChange={(e) => setEingabe(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void fragen();
            }
          }}
        />
        <button
          type="button"
          className="btn btn--info btn--schmal"
          onClick={() => void fragen()}
          disabled={laedt || eingabe.trim() === ""}
        >
          {laedt ? "…" : hatVorschlag ? "Anderer Zug" : "Modell fragen"}
        </button>
      </div>

      {kontextAktiv && !laedt && !antwort && (
        <p className="kontext-hinweis">Firmen-Notizen werden mitgeschickt.</p>
      )}

      {(laedt || antwort || modellFehler) && (
        <div className={modellFehler && !antwort ? "card error" : "card card--model"}>
          {laedt && !antwort && (
            <div className="loading">
              <span className="spinner" aria-hidden="true" />
              <span>Modell denkt nach …</span>
            </div>
          )}
          {antwort && (
            <p className="speech speech--big">
              {"„"}
              {antwort}
              {laedt && <span className="caret" aria-hidden="true" />}
              {"“"}
            </p>
          )}
          {modellFehler && <p className="note">{modellFehler}</p>}
        </div>
      )}
    </section>
  );
}
