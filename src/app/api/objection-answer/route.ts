import {
  authHeaders,
  chatBody,
  chatEndpoint,
  createStreamParser,
  nichtErreichbarText,
  resolveConfig,
} from "@/lib/model";
import { buildSystemPrompt } from "@/lib/prompt";
import type { Settings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Grosszuegig: lokale Modelle brauchen je nach Hardware deutlich laenger als eine Cloud-API. */
const ERSTES_TOKEN_TIMEOUT_MS = 45_000;
const MAX_EINWAND = 500;

export async function POST(request: Request) {
  let objection = "";
  let notizen = "";
  let ueberschreibung: Partial<Settings> | undefined;

  try {
    const body = (await request.json()) as {
      objection?: unknown;
      notes?: unknown;
      settings?: Partial<Settings>;
    };
    if (typeof body.objection === "string") objection = body.objection.trim();
    if (typeof body.notes === "string") notizen = body.notes;
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

  const config = resolveConfig(ueberschreibung);
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = setTimeout(
    () => controller.abort(),
    ERSTES_TOKEN_TIMEOUT_MS,
  );
  // Sobald das erste Token da ist, darf der Timer den laufenden Stream nicht abschiessen.
  const timeoutLoeschen = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  let upstream: Response;
  try {
    upstream = await fetch(chatEndpoint(config), {
      method: "POST",
      headers: authHeaders(config),
      body: JSON.stringify(chatBody(config, buildSystemPrompt(notizen), objection)),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch {
    timeoutLoeschen();
    return Response.json({ error: nichtErreichbarText(config) }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    timeoutLoeschen();
    const detail = (await upstream.text().catch(() => "")).slice(0, 200);
    return Response.json(
      {
        error: detail
          ? `${nichtErreichbarText(config)} (${upstream.status}: ${detail})`
          : nichtErreichbarText(config),
      },
      { status: 502 },
    );
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const parse = createStreamParser(config);

  const stream = new ReadableStream<Uint8Array>({
    async start(out) {
      const senden = (nutzlast: unknown) =>
        out.enqueue(encoder.encode(`${JSON.stringify(nutzlast)}\n`));

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          const ergebnis = parse(decoder.decode(value, { stream: true }));
          if (ergebnis.deltas.length > 0) {
            timeoutLoeschen();
            for (const delta of ergebnis.deltas) senden({ delta });
          }
          if (ergebnis.error) {
            senden({ error: ergebnis.error });
            return;
          }
          if (ergebnis.done) break;
        }
        senden({ done: true });
      } catch {
        senden({
          error: controller.signal.aborted
            ? "Zeitüberschreitung — das Modell hat innerhalb von 45 Sekunden nicht geantwortet."
            : nichtErreichbarText(config),
        });
      } finally {
        timeoutLoeschen();
        try {
          out.close();
        } catch {
          // Stream war bereits geschlossen (Client hat abgebrochen).
        }
      }
    },
    cancel() {
      timeoutLoeschen();
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
