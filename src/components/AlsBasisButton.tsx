"use client";

import { useState } from "react";
import { STEPS } from "@/data/script";
import { scriptToText } from "@/lib/scriptParser";

/**
 * Hebt eine neue Fassung zum Basis-Skript. Das Basis-Skript gilt fuer ALLE
 * Firmen — eine zugeschnittene Fassung traegt aber Details der gerade
 * angerufenen. Deshalb merkt sich der Knopf die vorherige Basis: ein Klick auf
 * "Rückgängig" stellt sie wieder her.
 *
 * Die angepasste Fassung dieses Kontakts bleibt absichtlich stehen. Sie ist
 * nach dem Festlegen wortgleich mit der Basis, stoert also nicht — und wuerde
 * man sie leeren, verschwaende die Karte, in der dieser Knopf sitzt, und mit
 * ihr das Rueckgaengig.
 */
export function AlsBasisButton({
  neu,
  basis,
  onBasis,
}: {
  neu: string;
  basis: string;
  onBasis: (wert: string) => void;
}) {
  const [vorher, setVorher] = useState<string | null>(null);
  // Kein Effekt, kein Zurücksetzen von Hand: sobald der Text sich ändert, ist
  // er nicht mehr der, der festgelegt wurde — der Knopf steht wieder bereit.
  const [gesetztAls, setGesetztAls] = useState("");

  const text = neu.trim();
  const aktuelleBasis = (basis.trim() || scriptToText(STEPS)).trim();
  const gesetzt = text !== "" && text === gesetztAls;
  const schonBasis = text !== "" && text === aktuelleBasis;

  if (gesetzt) {
    return (
      <>
        <button type="button" className="btn btn--schmal" disabled>
          Ist jetzt die Basis
        </button>
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            if (vorher !== null) onBasis(vorher);
            setGesetztAls("");
          }}
        >
          Rückgängig
        </button>
      </>
    );
  }

  return (
    <button
      type="button"
      className="btn btn--schmal"
      disabled={text === "" || schonBasis}
      title={
        schonBasis
          ? "Dieser Text ist bereits das Basis-Skript."
          : "Ersetzt das Basis-Skript — es gilt dann für alle Firmen."
      }
      onClick={() => {
        setVorher(basis);
        onBasis(text);
        setGesetztAls(text);
      }}
    >
      Als Basis-Skript festlegen
    </button>
  );
}
