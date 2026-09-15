import type { HealthState } from "@/lib/health";

export function HealthBanner({ health }: { health: HealthState | null }) {
  if (!health) return null;

  if (!health.ok || !health.modelFound) {
    return (
      <p className="banner">
        {health.ok
          ? `Modell „${health.model}“ nicht gefunden — die Einwand-Erkennung läuft trotzdem.`
          : `Modell nicht erreichbar${health.error ? `: ${health.error}` : ""} — die Einwand-Erkennung läuft trotzdem.`}
      </p>
    );
  }

  // Ehrlichkeit statt Marketing: hier rechnet nicht dieser Rechner.
  if (health.cloud) {
    return (
      <p className="banner">
        Cloud: „{health.model}“ — Einwände und Notizen verlassen diesen Rechner.
      </p>
    );
  }

  return null;
}
