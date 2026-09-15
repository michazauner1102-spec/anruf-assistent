/**
 * ====================================================================
 *  HIER ZUERST ÄNDERN, wenn du dieses Tool für dich selbst nutzt.
 *  Alles Firmenspezifische steht in dieser Datei. Skript und Einwände
 *  liegen daneben in script.ts und objections.ts.
 * ====================================================================
 */
export const PROFILE = {
  person: "Vorname Nachname",
  firma: "Ihre Firma",
  zielgruppe: "Immobilienmakler in Deutschland",
  /** Das eine Ziel jedes Anrufs. */
  ziel: "ein kostenloser 30-Minuten-Prozesscheck",
  /** Kurzbeschreibung des Angebots — nur nennen, wenn danach gefragt wird. */
  angebot:
    "System, das Anfragen sofort qualifiziert, Exposés automatisch verschickt und Termine bucht. Läuft auf den eigenen Accounts des Kunden, EU-Server, gehört ihm.",
  preis: "XXX Euro im Monat",
  nebenkosten: "Toolkosten zahlt der Kunde direkt an die Anbieter, ohne Aufschlag",
  /** Ein Satz, der das eigene Feld beschreibt — taucht im Opener auf. */
  spezialisierung: "Ihr Angebot in einem Halbsatz",
  /** Aktueller Stand — verhindert, dass das Modell Referenzen erfindet. */
  referenzstand: "Es gibt noch keine Referenzkunden. Ehrlich bleiben mit „Gründungskunden“ und „im Aufbau“.",
  terminLinkLabel: "calendly.com/ihr-name/30min",
} as const;

export const CALENDLY_LABEL = PROFILE.terminLinkLabel;
export const CALENDLY_URL = `https://${PROFILE.terminLinkLabel}`;
