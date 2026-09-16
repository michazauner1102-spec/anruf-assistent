import { resolveConfig } from "@/lib/model";
import { buildBriefingMessages } from "@/lib/prompt";
import { streameModellAntwort } from "@/lib/streamRoute";
import type { Settings } from "@/lib/settings";
import { pruefeZiel } from "@/lib/urlGuard";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let notizen = "";
  let kontext = "";
  let ueberschreibung: Partial<Settings> | undefined;

  try {
    const body = (await request.json()) as {
      notes?: unknown;
      kontext?: unknown;
      settings?: Partial<Settings>;
    };
    if (typeof body.notes === "string") notizen = body.notes;
    if (typeof body.kontext === "string") kontext = body.kontext;
    ueberschreibung = body.settings;
  } catch {
    return Response.json({ error: "Ungültiger Request-Body." }, { status: 400 });
  }

  if (notizen.trim().length < 40) {
    return Response.json(
      { error: "Zu wenig Notizen zum Auswerten — erst Recherche einfügen oder Website auslesen." },
      { status: 400 },
    );
  }

  if (ueberschreibung?.baseUrl) {
    const zielOk = await pruefeZiel(ueberschreibung.baseUrl, { erlaubeLoopback: true });
    if (!zielOk.ok) {
      return Response.json({ error: `Modell-Adresse abgelehnt: ${zielOk.grund}` }, { status: 400 });
    }
  }

  return streameModellAntwort(resolveConfig(ueberschreibung), buildBriefingMessages(notizen, kontext), {
    timeoutMs: 60_000,
    timeoutText: "Zeitüberschreitung bei der Auswertung.",
  });
}
