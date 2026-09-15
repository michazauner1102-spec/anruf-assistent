/** Von UI und Server geteilt — enthaelt niemals Vorbelegungen mit echten Keys. */

export type Provider = "ollama" | "openai";

export interface Settings {
  provider: Provider;
  /** Ollama: http://localhost:11434 — OpenAI-kompatibel: https://api.openai.com/v1 */
  baseUrl: string;
  model: string;
  /** Nur fuer OpenAI-kompatible Anbieter. Bleibt im Browser des Nutzers. */
  apiKey: string;
}

export const LEERE_SETTINGS: Settings = {
  provider: "ollama",
  baseUrl: "",
  model: "",
  apiKey: "",
};

const SPEICHER_SCHLUESSEL = "anruf-assistent.settings";

export function ladeSettings(): Partial<Settings> {
  if (typeof window === "undefined") return {};
  try {
    const roh = window.localStorage.getItem(SPEICHER_SCHLUESSEL);
    return roh ? (JSON.parse(roh) as Partial<Settings>) : {};
  } catch {
    return {};
  }
}

export function speichereSettings(settings: Partial<Settings>): void {
  try {
    window.localStorage.setItem(SPEICHER_SCHLUESSEL, JSON.stringify(settings));
  } catch {
    // Privater Modus o. Ä. — dann gilt weiter die Konfiguration aus .env.local
  }
}

/** Nur die Felder, die tatsaechlich gesetzt sind, werden an den Server geschickt. */
export function settingsFuerRequest(settings: Partial<Settings>): Partial<Settings> | undefined {
  const gefuellt = Object.fromEntries(
    Object.entries(settings).filter(([, wert]) => typeof wert === "string" && wert !== ""),
  ) as Partial<Settings>;
  return Object.keys(gefuellt).length > 0 ? gefuellt : undefined;
}
