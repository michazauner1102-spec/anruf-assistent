const PLACEHOLDER = /(\[[^\]]+\])/g;

/** Hebt Platzhalter wie [Name] oder [Zeit 1] hervor, damit sie beim Vorlesen auffallen. */
export function ScriptText({ text }: { text: string }) {
  return (
    <>
      {text.split(PLACEHOLDER).map((part, i) =>
        /^\[[^\]]+\]$/.test(part) ? (
          <mark key={i} className="ph">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

/** Wörtlich vorlesbarer Satz in Anführungszeichen. */
export function Speech({ text, big = false }: { text: string; big?: boolean }) {
  return (
    <p className={big ? "speech speech--big" : "speech"}>
      {"„"}
      <ScriptText text={text} />
      {"“"}
    </p>
  );
}
