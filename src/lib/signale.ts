/**
 * Signale sind das, worauf beim Auslesen einer fremden Website besonders
 * geachtet werden soll — einmal hinterlegt, gelten sie fuer jede weitere
 * Adresse. Der Sinn ist nicht nur das Finden: Steht zu einem Signal nichts auf
 * der Seite, soll genau das dastehen. Eine Luecke ist im Verkaufsgespraech
 * genauso brauchbar wie ein Treffer.
 */

export const MAX_SIGNALE = 12;
export const MAX_SIGNAL_LAENGE = 90;

/** Bewusst branchenneutral — was fuer jede Zielgruppe funktioniert. */
export const SIGNAL_VORSCHLAEGE = [
  "Offene Stellen",
  "Größe des Teams",
  "Erkennbare Software und Tools",
  "Wie man Kontakt aufnimmt (Formular, Chat, Telefon)",
  "Standorte",
  "Preise oder Pakete",
  "Neues aus den letzten Monaten",
  "Zertifikate und Mitgliedschaften",
];

/**
 * Ein Signal steht im Prompt in genau einer Zeile. Umbrueche und spitze
 * Klammern muessen deshalb raus — sonst liesse sich der Block aufbrechen,
 * in dem die Signale stehen.
 */
export function normalisiereSignal(roh: string): string {
  return roh
    .replace(/[\r\n]+/g, " ")
    .replace(/[<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SIGNAL_LAENGE);
}

/** Erkennt Doubletten unabhaengig von Gross- und Kleinschreibung. */
export function istSchonDa(signale: string[], signal: string): boolean {
  return signale.some((s) => s.toLowerCase() === signal.toLowerCase());
}

/**
 * Nimmt sowohl den rohen JSON-String aus dem Browser als auch eine bereits
 * geparste Liste aus einem Request-Body. In beiden Faellen wird geputzt,
 * entdoppelt und gekappt — der Server verlaesst sich nicht auf den Client.
 */
export function ladeSignale(roh: unknown): string[] {
  let liste: unknown = roh;
  if (typeof roh === "string") {
    try {
      liste = JSON.parse(roh);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(liste)) return [];

  const sauber: string[] = [];
  for (const eintrag of liste) {
    if (typeof eintrag !== "string") continue;
    const signal = normalisiereSignal(eintrag);
    if (!signal || istSchonDa(sauber, signal)) continue;
    sauber.push(signal);
    if (sauber.length >= MAX_SIGNALE) break;
  }
  return sauber;
}
