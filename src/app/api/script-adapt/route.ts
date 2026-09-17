import { resolveConfig } from "@/lib/model";
import { buildSkriptMessages, type SkriptModus } from "@/lib/prompt";
import { streameModellAntwort } from "@/lib/streamRoute";
import type { Settings } from "@/lib/settings";
import { pruefeZiel } from "@/lib/urlGuard";

export const dynamic = "force-dynamic";

const MAX_SKRIPT = 6000;

export async function POST(request: Request) {
  let skript = "";
  let briefing = "";
  let notizen = "";
  let modus: SkriptModus = "sprache";
  let ueberschreibung: Partial<Settings> | undefined;

  try {
    const body = (await request.json()) as {
      skript?: unknown;
      briefing?: unknown;
      notes?: unknown;
      modus?: unknown;
      settings?: Partial<Settings>;
    };
    if (typeof body.skript === "string") skript = body.skript.slice(0, MAX_SKRIPT);
    if (typeof body.briefing === "string") briefing = body.briefing;
    if (typeof body.notes === "string") notizen = body.notes;
    if (body.modus === "zuschnitt") modus = "zuschnitt";
    ueberschreibung = body.settings;
  } catch {
    return Response.json({ error: "Ungültiger Request-Body." }, { status: 400 });
  }

  if (skript.trim().length < 20) {
    return Response.json({ error: "Kein Skript zum Anpassen vorhanden." }, { status: 400 });
  }
  if (ueberschreibung?.baseUrl) {
    const zielOk = await pruefeZiel(ueberschreibung.baseUrl, { erlaubeLoopback: true });
    if (!zielOk.ok) {
      return Response.json({ error: `Modell-Adresse abgelehnt: ${zielOk.grund}` }, { status: 400 });
    }
  }

  return streameModellAntwort(
    resolveConfig(ueberschreibung),
    buildSkriptMessages(skript, { briefing, notizen }, modus),
    {
      timeoutMs: 90_000,
      timeoutText: "Zeitüberschreitung beim Anpassen des Skripts.",
      // Ein ganzes Skript ist um ein Vielfaches laenger als eine Einwand-Antwort.
      maxTokens: 1600,
      temperature: 0.4,
    },
  );
}
