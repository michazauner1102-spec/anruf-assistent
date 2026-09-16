import { resolveConfig } from "@/lib/model";
import { buildSummaryMessages } from "@/lib/prompt";
import { streameModellAntwort } from "@/lib/streamRoute";
import type { Zug } from "@/lib/conversation";
import type { Settings } from "@/lib/settings";
import { pruefeZiel } from "@/lib/urlGuard";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let verlauf: Zug[] = [];
  let ergebnis = "";
  let notizen = "";
  let ueberschreibung: Partial<Settings> | undefined;

  try {
    const body = (await request.json()) as {
      verlauf?: unknown;
      ergebnis?: unknown;
      notes?: unknown;
      settings?: Partial<Settings>;
    };
    if (Array.isArray(body.verlauf)) {
      verlauf = body.verlauf.filter(
        (z): z is Zug =>
          !!z &&
          typeof z === "object" &&
          typeof (z as Zug).text === "string" &&
          ((z as Zug).rolle === "gegenueber" || (z as Zug).rolle === "anrufer"),
      );
    }
    if (typeof body.ergebnis === "string") ergebnis = body.ergebnis;
    if (typeof body.notes === "string") notizen = body.notes;
    ueberschreibung = body.settings;
  } catch {
    return Response.json({ error: "Ungültiger Request-Body." }, { status: 400 });
  }

  if (verlauf.length === 0) {
    return Response.json({ error: "Kein Gesprächsverlauf vorhanden." }, { status: 400 });
  }

  if (ueberschreibung?.baseUrl) {
    const zielOk = await pruefeZiel(ueberschreibung.baseUrl, { erlaubeLoopback: true });
    if (!zielOk.ok) {
      return Response.json({ error: `Modell-Adresse abgelehnt: ${zielOk.grund}` }, { status: 400 });
    }
  }

  const config = resolveConfig(ueberschreibung);
  return streameModellAntwort(config, buildSummaryMessages(verlauf, { ergebnis, notizen }), {
    timeoutMs: 60_000,
    timeoutText: "Zeitüberschreitung bei der Zusammenfassung.",
    maxTokens: 600,
    temperature: 0.3,
  });
}
