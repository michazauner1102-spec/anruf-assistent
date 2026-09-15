import { OBJECTIONS, RUHE_SAETZE } from "@/data/objections";
import { matchFromSpeech } from "@/lib/search";

export const dynamic = "force-dynamic";

/**
 * Regressionstest der Einwand-Erkennung. Die Faelle stehen nicht hier, sondern
 * in den Daten: jeder Einwand bringt seinen Testsatz mit, dazu kommen die
 * Alltagssaetze aus RUHE_SAETZE. Dadurch testet ein Fork automatisch die
 * eigenen Inhalte.
 */
export async function GET() {
  const zeilen = [
    ...OBJECTIONS.filter((o) => o.testsatz).map((o) => {
      const treffer = matchFromSpeech(o.testsatz!);
      const ist = treffer?.objection.id ?? null;
      return {
        art: "Treffer",
        ok: ist === o.id,
        satz: o.testsatz!,
        erwartet: o.id,
        ist,
        ausloeser: treffer?.ausloeser ?? [],
      };
    }),
    ...RUHE_SAETZE.map((satz) => {
      const treffer = matchFromSpeech(satz);
      const ist = treffer?.objection.id ?? null;
      return {
        art: "Ruhe",
        ok: ist === null,
        satz,
        erwartet: null,
        ist,
        ausloeser: treffer?.ausloeser ?? [],
      };
    }),
  ];

  const ohneTestsatz = OBJECTIONS.filter((o) => !o.testsatz).map((o) => o.id);

  return Response.json({
    bestanden: zeilen.filter((z) => z.ok).length,
    gesamt: zeilen.length,
    einwaendeOhneTestsatz: ohneTestsatz,
    fehler: zeilen.filter((z) => !z.ok),
  });
}
