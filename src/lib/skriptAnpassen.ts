"use client";

import { settingsFuerRequest, type Settings } from "./settings";
import { leseStrom } from "./streamClient";

export type SkriptModus = "sprache" | "zuschnitt";

/** Ruft die Anpassung auf. Von Notiz- und Skriptbereich gleichermassen genutzt. */
export async function skriptAnpassen(params: {
  basisText: string;
  briefing: string;
  notizen: string;
  modus: SkriptModus;
  settings: Partial<Settings>;
  onDelta?: (text: string) => void;
}): Promise<{ text: string; fehler?: string }> {
  const { text, fehler } = await leseStrom(
    "/api/script-adapt",
    {
      skript: params.basisText,
      briefing: params.briefing,
      notes: params.notizen,
      modus: params.modus,
      settings: settingsFuerRequest(params.settings),
    },
    params.onDelta ?? (() => {}),
  );
  return { text: text.trim(), fehler };
}

const bereinigt = (text: string) =>
  text
    .split(/\r?\n/)
    .map((z) => z.trim())
    .filter(Boolean);

/** Wie viele Zeilen wurden tatsaechlich angefasst — macht den Eingriff nachprüfbar. */
export function geaenderteZeilen(basis: string, neu: string): string[] {
  const alt = bereinigt(basis);
  return bereinigt(neu).filter((z, i) => z !== alt[i]);
}
