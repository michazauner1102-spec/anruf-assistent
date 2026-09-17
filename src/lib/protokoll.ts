/**
 * Was nach einem Anruf uebrig bleibt — die Grundlage der Auswertung.
 * Einwand-Erkennung und Ergebnis werden ohnehin erfasst; hier werden sie
 * zusammengefuehrt, damit sich Fragen wie "welcher Einwand kostet die
 * meisten Gespraeche" beantworten lassen.
 */
export interface Anrufprotokoll {
  zeit: number;
  firma: string;
  ergebnis: string;
  /** IDs der Einwaende, die waehrend des Gespraechs erkannt wurden. */
  einwaende: string[];
  /** Wie weit das Skript gekommen ist, 1-basiert. */
  schritt: number;
  schritteGesamt: number;
}

export const MAX_PROTOKOLLE = 500;

export function ladeProtokoll(roh: string): Anrufprotokoll[] {
  try {
    const daten = JSON.parse(roh) as unknown;
    return Array.isArray(daten) ? (daten as Anrufprotokoll[]) : [];
  } catch {
    return [];
  }
}

export interface EinwandStatistik {
  id: string;
  anzahl: number;
  mitTermin: number;
  /** Anteil der Gespraeche mit diesem Einwand, die zu einem Termin führten. */
  quote: number;
}

const ZAEHLT_ALS_TERMIN = /termin vereinbart/i;

export function einwandStatistik(protokolle: Anrufprotokoll[]): EinwandStatistik[] {
  const zaehler = new Map<string, { anzahl: number; mitTermin: number }>();

  for (const p of protokolle) {
    const termin = ZAEHLT_ALS_TERMIN.test(p.ergebnis);
    // Mehrfachnennung im selben Gespraech zaehlt einmal.
    for (const id of new Set(p.einwaende)) {
      const eintrag = zaehler.get(id) ?? { anzahl: 0, mitTermin: 0 };
      eintrag.anzahl += 1;
      if (termin) eintrag.mitTermin += 1;
      zaehler.set(id, eintrag);
    }
  }

  return [...zaehler.entries()]
    .map(([id, e]) => ({ id, ...e, quote: e.anzahl > 0 ? e.mitTermin / e.anzahl : 0 }))
    .sort((a, b) => b.anzahl - a.anzahl);
}

export interface SchrittStatistik {
  schritt: number;
  anzahl: number;
  mitTermin: number;
}

/** Wo Gespraeche enden — zeigt, an welcher Stelle das Skript klemmt. */
export function schrittStatistik(protokolle: Anrufprotokoll[]): SchrittStatistik[] {
  const zaehler = new Map<number, { anzahl: number; mitTermin: number }>();
  for (const p of protokolle) {
    if (!p.schritt) continue;
    const eintrag = zaehler.get(p.schritt) ?? { anzahl: 0, mitTermin: 0 };
    eintrag.anzahl += 1;
    if (ZAEHLT_ALS_TERMIN.test(p.ergebnis)) eintrag.mitTermin += 1;
    zaehler.set(p.schritt, eintrag);
  }
  return [...zaehler.entries()]
    .map(([schritt, e]) => ({ schritt, ...e }))
    .sort((a, b) => a.schritt - b.schritt);
}

export function ergebnisVerteilung(protokolle: Anrufprotokoll[]): [string, number][] {
  const zaehler = new Map<string, number>();
  for (const p of protokolle) {
    const schluessel = p.ergebnis || "ohne Ergebnis";
    zaehler.set(schluessel, (zaehler.get(schluessel) ?? 0) + 1);
  }
  return [...zaehler.entries()].sort((a, b) => b[1] - a[1]);
}
