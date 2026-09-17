import { istAnredeStelle, istFesteAnrede, type PlatzhalterWerte } from "@/lib/platzhalter";

/**
 * Einsetzstellen: eckige Klammern, die offene Anrede "Frau/Herr", und eine fest
 * geschriebene Anrede, wenn direkt ein Namensplatzhalter folgt — sonst bliebe
 * ein vom Modell eingebautes "Herr" vor einer Frau stehen.
 */
const PLATZHALTER =
  /(\[[^\]]+\]|Frau\s*\/\s*Herrn?|Herrn?\s*\/\s*Frau|\b(?:Herrn?|Frau)(?=\s+\[(?:Name|Nachname)\]))/g;

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
          // Ohne bekannte Anrede bleibt eine fest geschriebene stehen, wie sie ist.
          if (!anrede) {
            return istFesteAnrede(teil) ? (
              <span key={i}>{teil}</span>
            ) : (
              <mark key={i} className="ph">
                {teil}
              </mark>
            );
          }
          return (
            <mark key={i} className="ph ph--gefuellt">
              {anrede}
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
