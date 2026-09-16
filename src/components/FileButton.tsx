"use client";

import { useRef } from "react";

/** Lädt eine Textdatei und reicht ihren Inhalt weiter. */
export function FileButton({ onText, label }: { onText: (text: string) => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" className="btn btn--schmal" onClick={() => ref.current?.click()}>
        {label}
      </button>
      <input
        ref={ref}
        type="file"
        accept=".txt,.md,.markdown,text/plain"
        hidden
        onChange={async (e) => {
          const datei = e.target.files?.[0];
          if (!datei) return;
          onText(await datei.text());
          // Zuruecksetzen, damit dieselbe Datei erneut gewaehlt werden kann.
          e.target.value = "";
        }}
      />
    </>
  );
}
