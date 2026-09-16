import {
  authHeaders,
  chatBody,
  chatEndpoint,
  createStreamParser,
  nichtErreichbarText,
  type ModelConfig,
} from "./model";

/**
 * Gemeinsame Mechanik aller Routen, die eine Modellantwort streamen.
 * Gibt NDJSON aus: {delta}, {error}, {done}.
 */
export async function streameModellAntwort(
  config: ModelConfig,
  messages: { role: string; content: string }[],
  optionen: { timeoutMs?: number; timeoutText?: string } = {},
): Promise<Response> {
  const timeoutMs = optionen.timeoutMs ?? 45_000;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = setTimeout(() => controller.abort(), timeoutMs);
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
      body: JSON.stringify(chatBody(config, messages)),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch {
    timeoutLoeschen();
    return Response.json({ error: nichtErreichbarText(config) }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    timeoutLoeschen();
    // Die Antwort des Anbieters kann Interna enthalten — nur den Status melden.
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
            ? (optionen.timeoutText ??
              `Zeitüberschreitung — das Modell hat innerhalb von ${Math.round(timeoutMs / 1000)} Sekunden nicht geantwortet.`)
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
