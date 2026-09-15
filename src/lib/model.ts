import type { Provider, Settings } from "./settings";

/**
 * Aufloesung der Modellkonfiguration: Einstellungen aus dem UI haben Vorrang,
 * danach .env.local, danach ein lokales Ollama als Standard.
 */
export interface ModelConfig {
  provider: Provider;
  baseUrl: string;
  model: string;
  apiKey: string;
}

const ENV_PROVIDER = (process.env.MODEL_PROVIDER as Provider | undefined) ?? "ollama";

function ohneSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export function resolveConfig(ueberschreibung?: Partial<Settings>): ModelConfig {
  const provider = ueberschreibung?.provider ?? ENV_PROVIDER;

  if (provider === "openai") {
    return {
      provider,
      baseUrl: ohneSlash(
        ueberschreibung?.baseUrl || process.env.CLOUD_BASE_URL || "https://api.openai.com/v1",
      ),
      model: ueberschreibung?.model || process.env.CLOUD_MODEL || "gpt-4o-mini",
      apiKey: ueberschreibung?.apiKey || process.env.CLOUD_API_KEY || "",
    };
  }

  return {
    provider: "ollama",
    baseUrl: ohneSlash(ueberschreibung?.baseUrl || process.env.OLLAMA_HOST || "http://localhost:11434"),
    model: ueberschreibung?.model || process.env.OLLAMA_MODEL || "gemma4:latest",
    apiKey: "",
  };
}

/** Ein ":cloud"-Tag bei Ollama rechnet auf ollama.com, nicht auf diesem Rechner. */
export function istCloud(config: ModelConfig): boolean {
  if (config.provider === "openai") return !/localhost|127\.0\.0\.1/.test(config.baseUrl);
  const tag = config.model.split(":")[1] ?? "";
  return tag === "cloud" || tag.endsWith("-cloud");
}

export function normalizeModelName(model: string): string {
  return model.includes(":") ? model : `${model}:latest`;
}

export function nichtErreichbarText(config: ModelConfig): string {
  if (config.provider === "openai") {
    return config.apiKey
      ? `Cloud-Anbieter unter ${config.baseUrl} nicht erreichbar — stimmen Basis-URL, Modellname und API-Key?`
      : "Kein API-Key hinterlegt. In den Einstellungen eintragen oder CLOUD_API_KEY in .env.local setzen.";
  }
  return istCloud(config)
    ? `Cloud-Modell "${config.model}" nicht erreichbar — läuft Ollama (ollama serve) und sind Sie angemeldet (ollama signin)?`
    : `Lokales Modell nicht erreichbar — läuft Ollama? (ollama serve) Ist das Modell installiert? (ollama pull ${config.model})`;
}

export function authHeaders(config: ModelConfig): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.provider === "openai" && config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }
  return headers;
}

export function chatEndpoint(config: ModelConfig): string {
  return config.provider === "openai"
    ? `${config.baseUrl}/chat/completions`
    : `${config.baseUrl}/api/chat`;
}

export function chatBody(
  config: ModelConfig,
  messages: { role: string; content: string }[],
) {
  if (config.provider === "openai") {
    return { model: config.model, stream: true, temperature: 0.6, max_tokens: 200, messages };
  }

  return {
    model: config.model,
    stream: true,
    // Ohne think:false verbraucht ein Thinking-Modell (z. B. gemma4) das gesamte
    // Token-Budget mit internem Denken und liefert leeren Inhalt zurueck.
    think: false,
    options: { temperature: 0.6, num_predict: 200 },
    messages,
  };
}

interface OllamaChunk {
  message?: { content?: string; thinking?: string };
  done?: boolean;
  error?: string;
}
interface OpenAiChunk {
  choices?: { delta?: { content?: string } }[];
  error?: { message?: string };
}

/**
 * Zerlegt den Antwortstrom beider Anbieter zeilenweise. Ollama liefert NDJSON,
 * OpenAI-kompatible Anbieter Server-Sent-Events.
 */
export function createStreamParser(config: ModelConfig) {
  let puffer = "";

  return function parse(chunk: string): { deltas: string[]; done: boolean; error?: string } {
    puffer += chunk;
    const zeilen = puffer.split("\n");
    puffer = zeilen.pop() ?? "";

    const deltas: string[] = [];
    let done = false;
    let error: string | undefined;

    for (const zeile of zeilen) {
      let inhalt = zeile.trim();
      if (!inhalt) continue;

      if (config.provider === "openai") {
        if (!inhalt.startsWith("data:")) continue;
        inhalt = inhalt.slice(5).trim();
        if (inhalt === "[DONE]") {
          done = true;
          continue;
        }
      }

      try {
        if (config.provider === "openai") {
          const parsed = JSON.parse(inhalt) as OpenAiChunk;
          if (parsed.error?.message) error = parsed.error.message;
          const text = parsed.choices?.[0]?.delta?.content;
          if (text) deltas.push(text);
        } else {
          const parsed = JSON.parse(inhalt) as OllamaChunk;
          if (parsed.error) error = parsed.error;
          // message.thinking wird verworfen, sonst landet das Denkprotokoll im Text.
          if (parsed.message?.content) deltas.push(parsed.message.content);
          if (parsed.done) done = true;
        }
      } catch {
        continue;
      }
    }

    return { deltas, done, error };
  };
}
