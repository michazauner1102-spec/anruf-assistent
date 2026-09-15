"use client";

interface StreamEvent {
  delta?: string;
  error?: string;
  done?: boolean;
}

/**
 * Liest eine NDJSON-Antwort der eigenen API-Routen Zeile fuer Zeile und meldet
 * jedes Textstueck sofort weiter. Wird von Antwort- und Zusammenfassungs-Route
 * gleichermassen genutzt.
 */
export async function leseStrom(
  url: string,
  body: unknown,
  onDelta: (gesamt: string) => void,
): Promise<{ text: string; fehler?: string }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const daten = (await res.json().catch(() => ({}))) as { error?: string };
    return { text: "", fehler: daten.error ?? "Das Modell hat nicht geantwortet." };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let puffer = "";
  let gesammelt = "";
  let fehler: string | undefined;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    puffer += decoder.decode(value, { stream: true });
    const zeilen = puffer.split("\n");
    puffer = zeilen.pop() ?? "";
    for (const zeile of zeilen) {
      const t = zeile.trim();
      if (!t) continue;
      let event: StreamEvent;
      try {
        event = JSON.parse(t) as StreamEvent;
      } catch {
        continue;
      }
      if (event.error) fehler = event.error;
      if (typeof event.delta === "string") {
        gesammelt += event.delta;
        onDelta(gesammelt);
      }
    }
  }

  return { text: gesammelt, fehler };
}
