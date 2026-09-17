import type { Step } from "@/data/script";

/**
 * Einfaches Textformat fuer ein eigenes Skript:
 *
 *   # Opener
 *   Guten Tag, [Name], hier ...
 *   > Pause. Antwort abwarten.
 *
 * "#" beginnt einen Schritt, ">" ist ein Hinweis, alles andere ist ein
 * gesprochener Satz. Text in eckigen Klammern hebt das UI als Einsetzstelle
 * hervor.
 *
 * Ein eingefuegtes Skript hat oft gar keine Ueberschriften — dann stuende alles
 * auf einer einzigen Karte. Kommt im ganzen Text kein "#" vor, trennt deshalb
 * die Leerzeile die Schritte. Sobald es Ueberschriften gibt, bleiben Leerzeilen
 * das, was sie dort sind: reine Absaetze innerhalb eines Schritts.
 */
export function parseScript(text: string): Step[] {
  const zeilen = text.split(/\r?\n/);
  const hatUeberschriften = zeilen.some((z) => z.trim().startsWith("#"));

  const schritte: Step[] = [];
  let aktuell: Step | null = null;

  for (const rohzeile of zeilen) {
    const zeile = rohzeile.trim();
    if (!zeile) {
      if (!hatUeberschriften) aktuell = null;
      continue;
    }

    if (zeile.startsWith("#")) {
      aktuell = {
        n: schritte.length + 1,
        title: zeile.replace(/^#+\s*/, "").trim() || `Schritt ${schritte.length + 1}`,
        lines: [],
      };
      schritte.push(aktuell);
      continue;
    }

    // Zeilen ohne eigene Ueberschrift bekommen einen Schritt spendiert. Der
    // Titel bleibt leer — "Schritt 2 von 6 · Schritt 2" hilft niemandem.
    if (!aktuell) {
      aktuell = { n: schritte.length + 1, title: "", lines: [] };
      schritte.push(aktuell);
    }

    if (zeile.startsWith(">")) {
      const hinweis = zeile.replace(/^>+\s*/, "").trim();
      aktuell.hint = aktuell.hint ? `${aktuell.hint} ${hinweis}` : hinweis;
    } else {
      aktuell.lines = [...(aktuell.lines ?? []), zeile];
    }
  }

  return schritte
    .filter((s) => (s.lines?.length ?? 0) > 0 || s.hint)
    .map((s, i) => ({ ...s, n: i + 1 }));
}

/** Erzeugt aus vorhandenen Schritten das Textformat — als Startpunkt zum Bearbeiten. */
export function scriptToText(steps: Step[]): string {
  return steps
    .map((s) => {
      const zeilen = [`# ${s.title}`];
      const inhalt = s.variants ? s.variants.flatMap((v) => v.lines) : (s.lines ?? []);
      zeilen.push(...inhalt);
      if (s.hint) zeilen.push(`> ${s.hint}`);
      return zeilen.join("\n");
    })
    .join("\n\n");
}
