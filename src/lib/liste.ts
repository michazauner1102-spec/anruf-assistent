import type { Anrede } from "./platzhalter";

/**
 * Ein Eintrag der Anrufliste. Alles, was bisher global im Browser lag
 * (Notizen, Briefing, Name, Anrede, zugeschnittenes Skript), gehoert zu
 * genau einem Kontakt — sonst muesste man zwischen zwei Anrufen alles
 * von Hand tauschen.
 */
export interface Kontakt {
  id: string;
  firma: string;
  name: string;
  anrede: Anrede;
  url: string;
  notizen: string;
  briefing: string;
  skriptAngepasst: string;
  /** Gesetzt, sobald der Anruf disponiert wurde. */
  ergebnis: string;
}

export interface Liste {
  kontakte: Kontakt[];
  aktivId: string;
}

export const LEERE_LISTE: Liste = { kontakte: [], aktivId: "" };

export function neuerKontakt(teil: Partial<Kontakt> = {}): Kontakt {
  return {
    id: `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    firma: "",
    name: "",
    anrede: "",
    url: "",
    notizen: "",
    briefing: "",
    skriptAngepasst: "",
    ergebnis: "",
    ...teil,
  };
}

function siehtNachUrlAus(wert: string): boolean {
  const w = wert.trim();
  if (!w || /\s/.test(w)) return false;
  return /^https?:\/\//i.test(w) || /^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(w);
}

/**
 * Nimmt eingefuegte Zeilen entgegen. Getrennt wird mit Tabulator, Semikolon
 * oder senkrechtem Strich — damit funktioniert sowohl Copy-Paste aus einer
 * Tabelle als auch eine handgetippte Liste. Die Felder werden am Inhalt
 * erkannt, nicht an ihrer Position.
 */
export function parseListe(text: string): Kontakt[] {
  return text
    .split(/\r?\n/)
    .map((zeile) => zeile.trim())
    .filter(Boolean)
    .map((zeile) => {
      const felder = zeile
        .split(/\t|;|\s\|\s/)
        .map((f) => f.trim())
        .filter(Boolean);

      const url = felder.find(siehtNachUrlAus) ?? "";
      const rest = felder.filter((f) => f !== url);

      let firma = rest[0] ?? "";
      const name = rest[1] ?? "";
      if (!firma && url) {
        try {
          firma = new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(
            /^www\./,
            "",
          );
        } catch {
          firma = url;
        }
      }

      return neuerKontakt({ firma, name, url });
    });
}

export function aktiverKontakt(liste: Liste): Kontakt | null {
  return liste.kontakte.find((k) => k.id === liste.aktivId) ?? liste.kontakte[0] ?? null;
}

/** Der naechste Kontakt, der noch kein Ergebnis hat. */
export function naechsterOffener(liste: Liste, abId: string): Kontakt | null {
  const start = liste.kontakte.findIndex((k) => k.id === abId);
  const spaeter = liste.kontakte.slice(start + 1).find((k) => !k.ergebnis);
  if (spaeter) return spaeter;
  return liste.kontakte.find((k) => !k.ergebnis && k.id !== abId) ?? null;
}

export function ladeListe(roh: string): Liste {
  try {
    const daten = JSON.parse(roh) as Partial<Liste>;
    if (!Array.isArray(daten.kontakte)) return LEERE_LISTE;
    return { kontakte: daten.kontakte, aktivId: daten.aktivId ?? daten.kontakte[0]?.id ?? "" };
  } catch {
    return LEERE_LISTE;
  }
}
