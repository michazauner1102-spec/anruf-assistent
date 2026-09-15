/** Ein Gespraechszug. "gegenueber" ist das Gegenueber, "anrufer" der Anrufer. */
export interface Zug {
  rolle: "gegenueber" | "anrufer";
  text: string;
}

/** Wie viele Zuege ans Modell gehen — genug fuer Kontext, ohne das Zeitbudget zu sprengen. */
export const MAX_ZUEGE = 12;

export function letzteZuege(verlauf: Zug[]): Zug[] {
  return verlauf.slice(-MAX_ZUEGE);
}
