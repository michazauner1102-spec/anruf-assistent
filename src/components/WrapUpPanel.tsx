"use client";

import { useState } from "react";
import { CHECKLIST } from "@/data/script";
import type { Zug } from "@/lib/conversation";
import { ERGEBNISSE } from "@/lib/prompt";
import { settingsFuerRequest, type Settings } from "@/lib/settings";
import { leseStrom } from "@/lib/streamClient";
import { CopyButton } from "./CopyButton";

function alsText(verlauf: Zug[]): string {
  return verlauf
    .map((z) => (z.rolle === "gegenueber" ? `· ${z.text}` : `  [Vorschlag] ${z.text}`))
    .join("\n");
}

export function WrapUpPanel({
  verlauf,
  notizen,
  settings,
  ergebnis,
  onErgebnis,
  checkliste,
  onCheckliste,
  onNeuesGespraech,
  hatNaechsten,
  onNaechsterKontakt,
}: {
  verlauf: Zug[];
  notizen: string;
  settings: Partial<Settings>;
  ergebnis: string;
  onErgebnis: (wert: string) => void;
  checkliste: boolean[];
  onCheckliste: (index: number) => void;
  onNeuesGespraech: () => void;
  hatNaechsten: boolean;
  onNaechsterKontakt: () => void;
}) {
  const [zusammenfassung, setZusammenfassung] = useState("");
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const mitschnitt = alsText(verlauf);
  const gesprochene = verlauf.filter((z) => z.rolle === "gegenueber").length;

  const erstellen = async () => {
    if (laedt || verlauf.length === 0) return;
    setLaedt(true);
    setFehler(null);
    setZusammenfassung("");
    try {
      const { text, fehler: f } = await leseStrom(
        "/api/summary",
        { verlauf, ergebnis, notes: notizen, settings: settingsFuerRequest(settings) },
        setZusammenfassung,
      );
      if (f) setFehler(f);
      else setZusammenfassung(text.trim());
    } catch {
      setFehler("Verbindung zur App unterbrochen.");
    } finally {
      setLaedt(false);
    }
  };

  return (
    <div className="panel">
      <p className="panel__hinweis">
        Der Mitschnitt stammt aus dem Raummikrofon und trennt <strong>nicht</strong> nach
        Sprechern — Ihre eigenen Sätze stehen mit drin. Die Zusammenfassung berücksichtigt
        das und ordnet nur zu, was eindeutig ist.
      </p>

      <div className="variants">
        {ERGEBNISSE.map((e) => (
          <button
            key={e}
            type="button"
            className="variant"
            aria-pressed={ergebnis === e}
            onClick={() => onErgebnis(ergebnis === e ? "" : e)}
          >
            {e}
          </button>
        ))}
      </div>

      <p className="panel__hinweis">
        Das Ergebnis genügt für die Auswertung — eine Zusammenfassung lohnt nur, wenn
        tatsächlich gesprochen wurde.
      </p>

      <div className="frage-row">
        <button
          type="button"
          className="btn btn--info"
          onClick={() => void erstellen()}
          disabled={laedt || verlauf.length === 0}
        >
          {laedt ? "…" : "Zusammenfassung erstellen"}
        </button>
        {zusammenfassung && <CopyButton text={zusammenfassung} label="Für Close kopieren" />}
      </div>

      {fehler && <p className="empty">{fehler}</p>}

      {(laedt || zusammenfassung) && (
        <textarea
          className="input textarea"
          value={zusammenfassung}
          rows={10}
          placeholder="wird erstellt …"
          onChange={(e) => setZusammenfassung(e.target.value)}
        />
      )}

      <div className="panel__kopf" style={{ marginTop: 18 }}>
        <span className="card__label" style={{ margin: 0 }}>
          Mitschnitt · {gesprochene} Äußerungen
        </span>
        {mitschnitt && <CopyButton text={mitschnitt} label="Mitschnitt kopieren" />}
      </div>

      {mitschnitt ? (
        <pre className="mitschnitt">{mitschnitt}</pre>
      ) : (
        <p className="empty">
          Noch nichts aufgenommen — das Mithören im Gespräch füllt den Mitschnitt.
        </p>
      )}

      <div className="checkliste">
        {CHECKLIST.map((punkt, i) => (
          <label key={punkt} className="check">
            <input
              type="checkbox"
              checked={checkliste[i] ?? false}
              onChange={() => onCheckliste(i)}
            />
            <span>{punkt}</span>
          </label>
        ))}
      </div>

      <div className="panel__fuss">
        <span>Setzt Mitschnitt, Ergebnis und Haken zurück.</span>
        <span>
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setZusammenfassung("");
              setFehler(null);
              onNeuesGespraech();
            }}
          >
            Neues Gespräch
          </button>
          {hatNaechsten && (
            <button
              type="button"
              className="link-btn"
              style={{ marginLeft: 16 }}
              onClick={() => {
                setZusammenfassung("");
                setFehler(null);
                onNaechsterKontakt();
              }}
            >
              Nächster Kontakt →
            </button>
          )}
        </span>
      </div>
    </div>
  );
}
