import { authHeaders, chatEndpoint, nichtErreichbarText, resolveConfig } from "@/lib/model";
import { pruefeZiel } from "@/lib/urlGuard";
import { RECHERCHE_PROMPT } from "@/lib/prompt";
import type { Settings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const MAX_SEITENTEXT = 12_000;

const MAX_BYTES = 2_000_000;
const MAX_WEITERLEITUNGEN = 3;
const ERLAUBTE_TYPEN = ["text/html", "text/plain", "application/xhtml+xml", "application/xml"];

/**
 * Holt eine Seite und prueft dabei JEDE Station. Ohne das koennte eine
 * oeffentliche Seite per Weiterleitung auf einen internen Dienst zeigen und
 * dessen Inhalt zurueckspielen.
 */
async function holeSicher(
  start: string,
): Promise<{ ok: true; text: string; host: string } | { ok: false; status: number; grund: string }> {
  let ziel = start;

  for (let hop = 0; hop <= MAX_WEITERLEITUNGEN; hop++) {
    const geprueft = await pruefeZiel(ziel);
    if (!geprueft.ok) return { ok: false, status: 400, grund: geprueft.grund };

    let res: Response;
    try {
      res = await fetch(geprueft.url, {
        redirect: "manual",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; AnrufAssistent/1.0)",
          Accept: "text/html,application/xhtml+xml,text/plain;q=0.9",
        },
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      });
    } catch {
      return { ok: false, status: 502, grund: "Website nicht erreichbar oder zu langsam." };
    }

    if (res.status >= 300 && res.status < 400) {
      const weiter = res.headers.get("location");
      if (!weiter) return { ok: false, status: 502, grund: "Weiterleitung ohne Ziel." };
      // Relative Weiterleitungen gegen die aktuelle Adresse aufloesen.
      ziel = new URL(weiter, geprueft.url).toString();
      continue;
    }

    if (!res.ok) {
      return { ok: false, status: 502, grund: `Website antwortet mit Status ${res.status}.` };
    }

    const typ = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (typ && !ERLAUBTE_TYPEN.includes(typ)) {
      return { ok: false, status: 415, grund: `Inhaltstyp ${typ} wird nicht gelesen.` };
    }

    // Groesse hart begrenzen, statt den Body blind komplett zu lesen.
    const laenge = Number(res.headers.get("content-length") ?? "0");
    if (laenge > MAX_BYTES) {
      return { ok: false, status: 413, grund: "Seite ist zu groß." };
    }

    const reader = res.body?.getReader();
    if (!reader) return { ok: false, status: 502, grund: "Leere Antwort." };

    const decoder = new TextDecoder();
    let gelesen = 0;
    let roh = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      gelesen += value.byteLength;
      if (gelesen > MAX_BYTES) {
        await reader.cancel().catch(() => undefined);
        break;
      }
      roh += decoder.decode(value, { stream: true });
    }

    return { ok: true, text: roh, host: geprueft.url.hostname };
  }

  return { ok: false, status: 502, grund: "Zu viele Weiterleitungen." };
}

function textAusHtml(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(request: Request) {
  let roh = "";
  let ueberschreibung: Partial<Settings> | undefined;
  try {
    const body = (await request.json()) as { url?: unknown; settings?: Partial<Settings> };
    if (typeof body.url === "string") roh = body.url.trim();
    ueberschreibung = body.settings;
  } catch {
    return Response.json({ error: "Ungültiger Request-Body." }, { status: 400 });
  }

  const geholt = await holeSicher(roh);
  if (!geholt.ok) {
    return Response.json({ error: geholt.grund }, { status: geholt.status });
  }
  const seitentext = textAusHtml(geholt.text).slice(0, MAX_SEITENTEXT);

  if (seitentext.length < 80) {
    return Response.json(
      { error: "Auf der Seite war kaum Text zu finden — bitte Notizen einfügen." },
      { status: 422 },
    );
  }

  // Rohtext durchs Modell schicken. Klappt das nicht, gibt es immer noch den Rohtext.
  // Eine vom Client gesetzte Basis-URL koennte sonst auf interne Dienste zeigen.
  if (ueberschreibung?.baseUrl) {
    const zielOk = await pruefeZiel(ueberschreibung.baseUrl, { erlaubeLoopback: true });
    if (!zielOk.ok) {
      return Response.json({ error: `Modell-Adresse abgelehnt: ${zielOk.grund}` }, { status: 400 });
    }
  }

  const config = resolveConfig(ueberschreibung);
  try {
    const body =
      config.provider === "openai"
        ? {
            model: config.model,
            stream: false,
            temperature: 0.2,
            max_tokens: 400,
            messages: [
              { role: "system", content: RECHERCHE_PROMPT },
              { role: "user", content: `<<<WEBSITE-ROHTEXT>>>\n${seitentext}\n<<<ENDE>>>` },
            ],
          }
        : {
            model: config.model,
            stream: false,
            think: false,
            options: { temperature: 0.2, num_predict: 400 },
            messages: [
              { role: "system", content: RECHERCHE_PROMPT },
              { role: "user", content: `<<<WEBSITE-ROHTEXT>>>\n${seitentext}\n<<<ENDE>>>` },
            ],
          };

    const res = await fetch(chatEndpoint(config), {
      method: "POST",
      headers: authHeaders(config),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const daten = (await res.json()) as {
      message?: { content?: string };
      choices?: { message?: { content?: string } }[];
    };
    const zusammenfassung = (
      daten.message?.content ??
      daten.choices?.[0]?.message?.content ??
      ""
    ).trim();

    if (!zusammenfassung) throw new Error("leere Antwort");
    return Response.json({ notes: zusammenfassung, quelle: geholt.host });
  } catch {
    return Response.json({
      notes: seitentext.slice(0, 1500),
      quelle: geholt.host,
      hinweis: `Rohtext der Seite — ${nichtErreichbarText(config)}`,
    });
  }
}
