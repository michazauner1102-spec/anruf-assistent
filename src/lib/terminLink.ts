/**
 * Terminlink eines beliebigen Anbieters — Calendly, cal.com, Google Kalender,
 * TidyCal, Microsoft Bookings oder eine eigene Seite. Gespeichert wird, was
 * eingetippt wurde; Adresse und Beschriftung werden daraus abgeleitet.
 */

export function terminUrl(roh: string): string {
  const wert = roh.trim();
  if (!wert) return "";
  return /^https?:\/\//i.test(wert) ? wert : `https://${wert}`;
}

/** Fürs Anzeigen: ohne Protokoll und ohne abschließenden Schrägstrich. */
export function terminLabel(roh: string): string {
  return roh
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
}
