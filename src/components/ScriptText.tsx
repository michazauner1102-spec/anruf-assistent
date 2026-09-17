import { istAnredeStelle, type PlatzhalterWerte } from "@/lib/platzhalter";

// Eckige Klammern und die ausgeschriebene Anrede "Frau/Herr" sind beide Einsetzstellen.
const PLATZHALTER = /(\[[^\]]+\]|Frau\s*\/\s*Herrn?|Herrn?\s*\/\s*Frau)/g;

/**
 * Hebt Platzhalter wie [Name] hervor. Ist fuer einen Platzhalter ein Wert
 * bekannt, steht dort der Wert — weiterhin markiert, damit im Gespraech
 * erkennbar bleibt, was eingesetzt wurde.
 */
export function ScriptText({ text, werte }: { text: string; werte?: PlatzhalterWerte }) {
  return (
    <>
      {text.split(PLATZHALTER).map((teil, i) => {
        if (istAnredeStelle(teil)) {
          const anrede = werte?.anrede;
          return (
            <mark key={i} className={anrede ? "ph ph--gefuellt" : "ph"}>
              {anrede ?? teil}
            </mark>
          );
        }
        if (!/^\[[^\]]+\]$/.test(teil)) return <span key={i}>{teil}</span>;
        const wert = werte?.[teil.slice(1, -1).trim().toLowerCase()];
        return (
          <mark key={i} className={wert ? "ph ph--gefuellt" : "ph"}>
            {wert ?? teil}
          </mark>
        );
      })}
    </>
  );
}

/** Wörtlich vorlesbarer Satz in Anführungszeichen. */
export function Speech({
  text,
  big = false,
  werte,
}: {
  text: string;
  big?: boolean;
  werte?: PlatzhalterWerte;
}) {
  return (
    <p className={big ? "speech speech--big" : "speech"}>
      {"\u201e"}
      <ScriptText text={text} werte={werte} />
      {"\u201c"}
    </p>
  );
}
