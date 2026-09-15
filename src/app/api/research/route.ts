import { authHeaders, chatEndpoint, nichtErreichbarText, resolveConfig } from "@/lib/model";
import { RECHERCHE_PROMPT } from "@/lib/prompt";
import type { Settings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const MAX_SEITENTEXT = 12_000;

/**
 * Nur oeffentliche http(s)-Adressen. Verhindert, dass ueber das Eingabefeld
 * interne Dienste im Netz des Nutzers abgefragt werden.
 */
function istOeffentlicheUrl(roh: string): URL | null {
  let url: URL;
  try {
    // Nur ergaenzen, wenn gar kein Schema angegeben ist — sonst wuerde aus
    // "file:///etc/passwd" ein scheinbar gueltiger Host.
    url = new URL(roh.includes("://") ? roh : `https://${roh}`);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const host = url.hostname.toLowerCase();
  const gesperrt =
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "::1" ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);

  return gesperrt ? null : url;
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

  const url = istOeffentlicheUrl(roh);
  if (!url) {
    return Response.json(
      { error: "Bitte eine öffentliche Webadresse angeben (http oder https)." },
      { status: 400 },
    );
  }

  let seitentext: string;
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AnrufAssistent/1.0)" },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (!res.ok) {
      return Response.json(
        { error: `Website antwortet mit Status ${res.status}.` },
        { status: 502 },
      );
    }
    seitentext = textAusHtml(await res.text()).slice(0, MAX_SEITENTEXT);
  } catch {
    return Response.json({ error: "Website nicht erreichbar oder zu langsam." }, { status: 502 });
  }

  if (seitentext.length < 80) {
    return Response.json(
      { error: "Auf der Seite war kaum Text zu finden — bitte Notizen einfügen." },
      { status: 422 },
    );
  }

  // Rohtext durchs Modell schicken. Klappt das nicht, gibt es immer noch den Rohtext.
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
              { role: "user", content: seitentext },
            ],
          }
        : {
            model: config.model,
            stream: false,
            think: false,
            options: { temperature: 0.2, num_predict: 400 },
            messages: [
              { role: "system", content: RECHERCHE_PROMPT },
              { role: "user", content: seitentext },
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
    return Response.json({ notes: zusammenfassung, quelle: url.hostname });
  } catch {
    return Response.json({
      notes: seitentext.slice(0, 1500),
      quelle: url.hostname,
      hinweis: `Rohtext der Seite — ${nichtErreichbarText(config)}`,
    });
  }
}
