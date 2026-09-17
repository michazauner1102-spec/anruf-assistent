/**
 * Platzhalter im Skript mit echten Werten fuellen. Aktuell der Name des
 * Gespraechspartners: aus "Thomas Bergmann" werden [Name], [Vorname] und
 * [Nachname] bedient. Alle anderen Platzhalter bleiben stehen.
 */
export type PlatzhalterWerte = Record<string, string>;

/** Titel und Anreden, die nicht als Vorname durchgehen duerfen. */
const TITEL =
  /^(dr|prof|dipl|ing|mag|med|rer|nat|habil|phd|msc|bsc|mba|herr|herrn|frau|mr|mrs|ms)\.?$/i;

/** "Herr", "Frau" oder leer, wenn unbekannt. */
export type Anrede = "Herr" | "Frau" | "";

export function platzhalterAusName(name: string, anrede: Anrede = ""): PlatzhalterWerte {
  const sauber = name.trim().replace(/\s+/g, " ");
  if (!sauber) return {};

  // "Dr. Anna Kellermann" ergibt sonst die Anrede "Guten Tag, Dr."
  const teile = sauber.split(" ");
  const ohneTitel = teile.filter((t) => !TITEL.test(t.replace(/[.,]/g, "")));
  const namensteile = ohneTitel.length > 0 ? ohneTitel : teile;

  // "von", "van", "de" gehoeren zum Nachnamen: "Frau von Hoff", nicht "Frau Hoff".
  const PARTIKEL = /^(von|van|vom|zu|zur|der|den|de|del|di|da|le|la)$/i;
  let nachname = namensteile[namensteile.length - 1];
  const davor = namensteile[namensteile.length - 2];
  if (namensteile.length > 2 && davor && PARTIKEL.test(davor)) {
    nachname = `${davor} ${nachname}`;
  }

  const werte: PlatzhalterWerte = {
    name: sauber,
    vorname: namensteile[0],
    nachname,
  };
  if (anrede) werte.anrede = anrede;
  return werte;
}

/**
 * Viele Skripte schreiben die Anrede als "Frau/Herr" aus, weil beim Verfassen
 * noch offen ist, wer abnimmt. Ist die Anrede bekannt, wird daraus die richtige.
 */
export const ANREDE_MUSTER = /(Frau\s*\/\s*Herrn?|Herrn?\s*\/\s*Frau)/g;

export function istAnredeStelle(teil: string): boolean {
  return /^(Frau\s*\/\s*Herrn?|Herrn?\s*\/\s*Frau)$/.test(teil);
}

/** Sucht in einem Briefing die Zeile "Anrede: …". */
export function anredeAus(briefing: string): Anrede {
  const treffer = briefing.match(/^[*\s-]*Anrede\s*:\s*(.+)$/im);
  if (!treffer) return "";
  const wert = treffer[1].replace(/[*_.]/g, "").trim().toLowerCase();
  if (wert.startsWith("herr")) return "Herr";
  if (wert.startsWith("frau")) return "Frau";
  return "";
}

/** Sucht in einem Briefing die Zeile "Ansprechpartner: …". */
export function ansprechpartnerAus(briefing: string): string {
  const treffer = briefing.match(/^[*\s-]*Ansprechpartner\s*:\s*(.+)$/im);
  if (!treffer) return "";
  const wert = treffer[1].replace(/[*_]/g, "").trim();
  // Gedankenstriche und Verlegenheitsantworten zaehlen als "nicht gefunden".
  if (/^[-–—]$/.test(wert) || /^(unbekannt|keine angabe|nicht genannt)$/i.test(wert)) return "";
  return wert;
}
