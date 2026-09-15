import type { Step } from "@/data/script";

/**
 * Einfaches Textformat fuer ein eigenes Skript:
 *
 *   # Opener
 *   Guten Tag, [Name], hier ...
 *   > Pause. Antwort abwarten.
 *
 * "#" beginnt einen Schritt, ">" ist ein Hinweis, alles andere ist ein
 * gesprochener Satz. Leerzeilen werden ignoriert. Text in eckigen Klammern
 * hebt das UI als Einsetzstelle hervor.
 */
export function parseScript(text: string): Step[] {
  const schritte: Step[] = [];
  let aktuell: Step | null = null;

  for (const rohzeile of text.split(/\r?\n/)) {
    const zeile = rohzeile.trim();
    if (!zeile) continue;

    if (zeile.startsWith("#")) {
      aktuell = {
        n: schritte.length + 1,
        title: zeile.replace(/^#+\s*/, "").trim() || `Schritt ${schritte.length + 1}`,
        lines: [],
      };
      schritte.push(aktuell);
      continue;
    }

    // Zeilen vor der ersten Ueberschrift bekommen einen Schritt spendiert.
    if (!aktuell) {
      aktuell = { n: 1, title: "Schritt 1", lines: [] };
      schritte.push(aktuell);
    }

    if (zeile.startsWith(">")) {
      const hinweis = zeile.replace(/^>+\s*/, "").trim();
      aktuell.hint = aktuell.hint ? `${aktuell.hint} ${hinweis}` : hinweis;
    } else {
      aktuell.lines = [...(aktuell.lines ?? []), zeile];
    }
  }

  return schritte.filter((s) => (s.lines?.length ?? 0) > 0 || s.hint);
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
