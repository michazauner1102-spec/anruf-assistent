import { authHeaders, istCloud, normalizeModelName, resolveConfig } from "@/lib/model";
import type { Settings } from "@/lib/settings";

export const dynamic = "force-dynamic";

async function ollamaGesund(baseUrl: string, model: string) {
  const res = await fetch(`${baseUrl}/api/tags`, {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const daten = (await res.json()) as { models?: { name?: string }[] };
  const installiert = (daten.models ?? [])
    .map((e) => e.name)
    .filter((n): n is string => typeof n === "string")
    .map(normalizeModelName);

  if (installiert.includes(normalizeModelName(model))) return true;

  // Cloud-Modelle tauchen nicht zwingend in /api/tags auf — /api/show loest sie auf.
  const show = await fetch(`${baseUrl}/api/show`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model }),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  return show.ok;
}

export async function POST(request: Request) {
  let ueberschreibung: Partial<Settings> | undefined;
  try {
    const body = (await request.json()) as { settings?: Partial<Settings> };
    ueberschreibung = body.settings;
  } catch {
    ueberschreibung = undefined;
  }

  const config = resolveConfig(ueberschreibung);
  const basis = {
    provider: config.provider,
    model: config.model,
    cloud: istCloud(config),
  };

  try {
    if (config.provider === "openai") {
      if (!config.apiKey) {
        return Response.json({
          ...basis,
          ok: false,
          modelFound: false,
          error: "Kein API-Key hinterlegt.",
        });
      }
      const res = await fetch(`${config.baseUrl}/models`, {
        headers: authHeaders(config),
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const daten = (await res.json()) as { data?: { id?: string }[] };
      const ids = (daten.data ?? []).map((m) => m.id);
      // Nicht jeder Anbieter listet alle Modelle — leere Liste gilt nicht als Fehler.
      const gefunden = ids.length === 0 || ids.includes(config.model);
      return Response.json({ ...basis, ok: true, modelFound: gefunden });
    }

    const gefunden = await ollamaGesund(config.baseUrl, config.model);
    return Response.json({ ...basis, ok: true, modelFound: gefunden });
  } catch {
    return Response.json({
      ...basis,
      ok: false,
      modelFound: false,
      error:
        config.provider === "openai"
          ? `Anbieter unter ${config.baseUrl} nicht erreichbar — Basis-URL und Key prüfen.`
          : "Ollama nicht erreichbar.",
    });
  }
}
