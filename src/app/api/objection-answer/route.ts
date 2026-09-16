import { resolveConfig } from "@/lib/model";
import { buildMessages } from "@/lib/prompt";
import { streameModellAntwort } from "@/lib/streamRoute";
import type { Zug } from "@/lib/conversation";
import type { Settings } from "@/lib/settings";
import { pruefeZiel } from "@/lib/urlGuard";

export const dynamic = "force-dynamic";

const MAX_EINWAND = 500;

export async function POST(request: Request) {
  let objection = "";
  let notizen = "";
  let kontext = "";
  let briefing = "";
  let verlauf: Zug[] = [];
  let bereits: string[] = [];
  let ueberschreibung: Partial<Settings> | undefined;

  try {
    const body = (await request.json()) as {
      objection?: unknown;
      notes?: unknown;
      kontext?: unknown;
      briefing?: unknown;
      verlauf?: unknown;
      bereits?: unknown;
      settings?: Partial<Settings>;
    };
    if (typeof body.objection === "string") objection = body.objection.trim();
    if (typeof body.notes === "string") notizen = body.notes;
    if (typeof body.kontext === "string") kontext = body.kontext;
    if (typeof body.briefing === "string") briefing = body.briefing;
    if (Array.isArray(body.verlauf)) {
      verlauf = body.verlauf.filter(
        (z): z is Zug =>
          !!z &&
          typeof z === "object" &&
          typeof (z as Zug).text === "string" &&
          ((z as Zug).rolle === "gegenueber" || (z as Zug).rolle === "anrufer"),
      );
    }
    if (Array.isArray(body.bereits)) {
      bereits = body.bereits.filter((b): b is string => typeof b === "string");
    }
    ueberschreibung = body.settings;
  } catch {
    return Response.json({ error: "Ungültiger Request-Body." }, { status: 400 });
  }

  if (!objection) return Response.json({ error: "Kein Einwand übergeben." }, { status: 400 });
  if (objection.length > MAX_EINWAND) {
    return Response.json(
      { error: `Einwand ist zu lang (max. ${MAX_EINWAND} Zeichen).` },
      { status: 400 },
    );
  }

  // Eine vom Client gesetzte Basis-URL koennte sonst auf interne Dienste zeigen.
  if (ueberschreibung?.baseUrl) {
    const zielOk = await pruefeZiel(ueberschreibung.baseUrl, { erlaubeLoopback: true });
    if (!zielOk.ok) {
      return Response.json({ error: `Modell-Adresse abgelehnt: ${zielOk.grund}` }, { status: 400 });
    }
  }

  const config = resolveConfig(ueberschreibung);
  return streameModellAntwort(
    config,
    buildMessages(objection, { notizen, briefing, kontext, verlauf, bereits }),
  );
}
