"use client";

import { STEPS } from "@/data/script";
import { ScriptText, Speech } from "./ScriptText";

export function Stepper({
  index,
  onIndexChange,
  variantId,
  onVariantChange,
}: {
  index: number;
  onIndexChange: (index: number) => void;
  variantId: string;
  onVariantChange: (id: string) => void;
}) {
  const last = STEPS.length - 1;
  const current = STEPS[index];
  const variant = current.variants?.find((v) => v.id === variantId) ?? current.variants?.[0];
  const lines = variant ? variant.lines : (current.lines ?? []);

  return (
    <section aria-label="Gesprächsablauf">
      <div className="card card--step">
        <p className="progress">
          Schritt {index + 1} von {STEPS.length} · {current.title}
        </p>

        {current.variants && (
          <div className="variants">
            {current.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                className="variant"
                aria-pressed={v.id === (variant?.id ?? "")}
                onClick={() => onVariantChange(v.id)}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}

        {lines.map((line) => (
          <Speech key={line} text={line} big />
        ))}

        {current.hint && (
          <p className="hint">
            <ScriptText text={current.hint} />
          </p>
        )}
      </div>

      <div className="controls">
        <button
          type="button"
          className="btn"
          onClick={() => onIndexChange(index - 1)}
          disabled={index === 0}
        >
          ◀ Zurück
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => onIndexChange(index + 1)}
          disabled={index === last}
        >
          Weiter ▶
        </button>
      </div>
    </section>
  );
}
