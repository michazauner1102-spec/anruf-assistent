"use client";

import type { Settings } from "@/lib/settings";

export function SettingsPanel({
  settings,
  onChange,
}: {
  settings: Partial<Settings>;
  onChange: (settings: Partial<Settings>) => void;
}) {
  const provider = settings.provider ?? "ollama";
  const setze = (feld: keyof Settings, wert: string) => onChange({ ...settings, [feld]: wert });

  return (
    <div className="panel">
      <div className="variants">
        <button
          type="button"
          className="variant"
          aria-pressed={provider === "ollama"}
          onClick={() => onChange({ ...settings, provider: "ollama" })}
        >
          Lokales Modell
        </button>
        <button
          type="button"
          className="variant"
          aria-pressed={provider === "openai"}
          onClick={() => onChange({ ...settings, provider: "openai" })}
        >
          Cloud-API
        </button>
      </div>

      <label className="feld">
        <span>{provider === "ollama" ? "Ollama-Adresse" : "Basis-URL"}</span>
        <input
          className="input"
          type="text"
          value={settings.baseUrl ?? ""}
          placeholder={
            provider === "ollama" ? "http://localhost:11434" : "https://api.openai.com/v1"
          }
          onChange={(e) => setze("baseUrl", e.target.value)}
        />
      </label>

      <label className="feld">
        <span>Modell</span>
        <input
          className="input"
          type="text"
          value={settings.model ?? ""}
          placeholder={provider === "ollama" ? "gemma4:latest" : "gpt-4o-mini"}
          onChange={(e) => setze("model", e.target.value)}
        />
      </label>

      {provider === "openai" && (
        <label className="feld">
          <span>API-Key</span>
          <input
            className="input"
            type="password"
            autoComplete="off"
            value={settings.apiKey ?? ""}
            placeholder="sk-…"
            onChange={(e) => setze("apiKey", e.target.value)}
          />
        </label>
      )}

      <p className="panel__hinweis">
        Leere Felder nutzen die Werte aus <code>.env.local</code>. Eingaben bleiben in diesem
        Browser; der Key wird nur an die eigene API-Route und von dort an den gewählten
        Anbieter geschickt.
      </p>
    </div>
  );
}
