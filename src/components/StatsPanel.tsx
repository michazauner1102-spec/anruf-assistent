"use client";

import { OBJECTIONS } from "@/data/objections";
import {
  einwandStatistik,
  ergebnisVerteilung,
  schrittStatistik,
  type Anrufprotokoll,
} from "@/lib/protokoll";

const prozent = (anteil: number) => `${Math.round(anteil * 100)} %`;

export function StatsPanel({
  protokolle,
  onLeeren,
}: {
  protokolle: Anrufprotokoll[];
  onLeeren: () => void;
}) {
  if (protokolle.length === 0) {
    return (
      <div className="panel">
        <p className="panel__hinweis">
          Noch keine Anrufe erfasst. Jedes Gespräch, das in der Nachbereitung ein Ergebnis
          bekommt, landet hier — mit den Einwänden, die dabei erkannt wurden.
        </p>
      </div>
    );
  }

  const einwaende = einwandStatistik(protokolle);
  const schritte = schrittStatistik(protokolle);
  const ergebnisse = ergebnisVerteilung(protokolle);
  const frage = (id: string) => OBJECTIONS.find((o) => o.id === id)?.question ?? id;

  return (
    <div className="panel">
      <p className="panel__hinweis">
        {protokolle.length} erfasste Anrufe. Die Quote sagt, wie oft ein Gespräch mit diesem
        Einwand trotzdem zu einem Termin führte — nicht, ob der Einwand schuld war.
      </p>

      <span className="card__label">Ergebnisse</span>
      <table className="tabelle">
        <tbody>
          {ergebnisse.map(([name, anzahl]) => (
            <tr key={name}>
              <td>{name}</td>
              <td className="tabelle__zahl">{anzahl}</td>
              <td className="tabelle__zahl">{prozent(anzahl / protokolle.length)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {einwaende.length > 0 && (
        <>
          <div className="panel__trenner" />
          <span className="card__label">Einwände nach Häufigkeit</span>
          <table className="tabelle">
            <tbody>
              {einwaende.map((e) => (
                <tr key={e.id}>
                  <td>{frage(e.id)}</td>
                  <td className="tabelle__zahl">{e.anzahl}×</td>
                  <td className="tabelle__zahl">{prozent(e.quote)} Termin</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {schritte.length > 0 && (
        <>
          <div className="panel__trenner" />
          <span className="card__label">Wie weit die Gespräche kamen</span>
          <table className="tabelle">
            <tbody>
              {schritte.map((s) => (
                <tr key={s.schritt}>
                  <td>bis Schritt {s.schritt}</td>
                  <td className="tabelle__zahl">{s.anzahl}</td>
                  <td className="tabelle__zahl">
                    {s.anzahl > 0 ? prozent(s.mitTermin / s.anzahl) : "—"} Termin
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <div className="panel__fuss">
        <span>Bleibt in diesem Browser, wird nirgends hochgeladen.</span>
        <button type="button" className="link-btn" onClick={onLeeren}>
          Auswertung leeren
        </button>
      </div>
    </div>
  );
}
