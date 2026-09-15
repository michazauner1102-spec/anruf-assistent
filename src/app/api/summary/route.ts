import {
  authHeaders,
  chatBody,
  chatEndpoint,
  createStreamParser,
  nichtErreichbarText,
  resolveConfig,
} from "@/lib/model";
import { buildSummaryMessages } from "@/lib/prompt";
import type { Zug } from "@/lib/conversation";
import type { Settings } from "@/lib/settings";
import { pruefeZiel } from "@/lib/urlGuard";

export const dynamic = "force-dynamic";

const TIMEOUT_MS = 60_000;

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
          ((z as Zug).rolle === "makler" || (z as Zug).rolle === "micha"),
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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let upstream: Response;
  try {
    upstream = await fetch(chatEndpoint(config), {
      method: "POST",
      headers: authHeaders(config),
      body: JSON.stringify(chatBody(config, buildSummaryMessages(verlauf, { ergebnis, notizen }))),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch {
    clearTimeout(timer);
    return Response.json({ error: nichtErreichbarText(config) }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    clearTimeout(timer);
    await upstream.body?.cancel().catch(() => undefined);
    return Response.json(
      { error: `${nichtErreichbarText(config)} (Status ${upstream.status})` },
      { status: 502 },
    );
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const parse = createStreamParser(config);

  const stream = new ReadableStream<Uint8Array>({
    async start(out) {
      const senden = (n: unknown) => out.enqueue(encoder.encode(`${JSON.stringify(n)}\n`));
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const ergebnisse = parse(decoder.decode(value, { stream: true }));
          for (const delta of ergebnisse.deltas) senden({ delta });
          if (ergebnisse.error) {
            senden({ error: ergebnisse.error });
            return;
          }
          if (ergebnisse.done) break;
        }
        senden({ done: true });
      } catch {
        senden({
          error: controller.signal.aborted
            ? "Zeitüberschreitung bei der Zusammenfassung."
            : nichtErreichbarText(config),
        });
      } finally {
        clearTimeout(timer);
        try {
          out.close();
        } catch {
          // Stream war bereits geschlossen.
        }
      }
    },
    cancel() {
      clearTimeout(timer);
      controller.abort();
      void reader.cancel().catch(() => undefined);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
