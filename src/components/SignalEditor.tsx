"use client";

import { useState } from "react";
import {
  istSchonDa,
  MAX_SIGNALE,
  normalisiereSignal,
  SIGNAL_VORSCHLAEGE,
} from "@/lib/signale";

/**
 * Legt fest, worauf beim Auslesen einer Website geachtet wird. Die Liste gilt
 * fuer alle weiteren Adressen — einmal festlegen, dann bleibt sie stehen.
 * Zugeklappt, weil sie im Alltag selten angefasst wird.
 */
export function SignalEditor({
  signale,
  onChange,
}: {
  signale: string[];
  onChange: (neu: string[]) => void;
}) {
  const [offen, setOffen] = useState(false);
  const [eingabe, setEingabe] = useState("");

  const voll = signale.length >= MAX_SIGNALE;

  const hinzufuegen = (roh: string) => {
    const signal = normalisiereSignal(roh);
    if (!signal || voll || istSchonDa(signale, signal)) return;
    onChange([...signale, signal]);
    setEingabe("");
  };

  const offeneVorschlaege = SIGNAL_VORSCHLAEGE.filter((v) => !istSchonDa(signale, v));

  return (
    <div className="signale">
      <div className="signale__kopf">
        <span>
          {signale.length === 0
            ? "Keine Signale festgelegt — das Modell fasst dann frei zusammen."
            : `Achtet auf ${signale.length} Signal${signale.length === 1 ? "" : "e"}: ${signale.join(" · ")}`}
        </span>
        <button type="button" className="link-btn" onClick={() => setOffen((o) => !o)}>
          {offen ? "Fertig" : signale.length === 0 ? "Festlegen" : "Ändern"}
        </button>
      </div>

      {offen && (
        <>
          <p className="panel__hinweis">
            Was Sie hier eintragen, wird bei jeder Website abgefragt — auch bei der ganzen
            Liste auf einmal. Findet sich nichts dazu, steht das ausdrücklich da. Gespeichert
            bleibt es in diesem Browser, bis Sie es ändern.
          </p>

          {signale.length > 0 && (
            <div className="signal-liste">
              {signale.map((signal) => (
                <span key={signal} className="signal">
                  {signal}
                  <button
                    type="button"
                    aria-label={`${signal} entfernen`}
                    onClick={() => onChange(signale.filter((s) => s !== signal))}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="frage-row">
            <input
              className="input"
              type="text"
              value={eingabe}
              placeholder="z. B. Wer bearbeitet Anfragen?"
              autoComplete="off"
              disabled={voll}
              onChange={(e) => setEingabe(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  hinzufuegen(eingabe);
                }
              }}
            />
            <button
              type="button"
              className="btn btn--schmal"
              disabled={voll || normalisiereSignal(eingabe) === ""}
              onClick={() => hinzufuegen(eingabe)}
            >
              Hinzufügen
            </button>
          </div>

          {voll ? (
            <p className="panel__hinweis">
              {MAX_SIGNALE} Signale sind das Maximum — mehr davon macht die Auswertung
              flacher, nicht besser.
            </p>
          ) : (
            offeneVorschlaege.length > 0 && (
              <div className="signal-liste signal-liste--vorschlag">
                {offeneVorschlaege.map((vorschlag) => (
                  <button
                    key={vorschlag}
                    type="button"
                    className="signal signal--vorschlag"
                    onClick={() => hinzufuegen(vorschlag)}
                  >
                    + {vorschlag}
                  </button>
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
