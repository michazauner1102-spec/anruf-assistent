import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Schutz gegen SSRF. Der Hostname allein genuegt nicht: eine oeffentliche
 * Domain kann auf 127.0.0.1 zeigen, und eine oeffentliche Seite kann per
 * Weiterleitung auf eine interne Adresse verweisen. Geprueft wird deshalb die
 * tatsaechlich aufgeloeste IP — und zwar bei jeder Weiterleitung erneut.
 */

function v4IstPrivat(ip: string): boolean {
  const t = ip.split(".").map(Number);
  if (t.length !== 4 || t.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b] = t;
  return (
    a === 0 || // "dieses Netz"
    a === 10 ||
    a === 127 || // Loopback
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // Link-local, enthaelt 169.254.169.254
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 // Multicast und reserviert
  );
}

function v6IstPrivat(ip: string): boolean {
  const k = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (k === "::1" || k === "::") return true;
  // IPv4-gemappt (::ffff:10.0.0.1) auf die eingebettete Adresse pruefen
  const gemappt = k.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (gemappt) return v4IstPrivat(gemappt[1]);
  const kopf = parseInt(k.split(":")[0] || "0", 16);
  if ((kopf & 0xfe00) === 0xfc00) return true; // fc00::/7 Unique Local
  if ((kopf & 0xffc0) === 0xfe80) return true; // fe80::/10 Link-local
  return false;
}

export function istPrivateIp(ip: string): boolean {
  const art = isIP(ip);
  if (art === 4) return v4IstPrivat(ip);
  if (art === 6) return v6IstPrivat(ip);
  return true; // Unbekanntes Format gilt als unsicher
}

export interface ZielPruefung {
  erlaubeLoopback?: boolean;
}

/**
 * Prueft eine einzelne Adresse: Schema, aufgeloeste IP-Adressen, Sonderfaelle.
 * Gibt die geparste URL zurueck oder einen Grund fuer die Ablehnung.
 */
export async function pruefeZiel(
  roh: string,
  optionen: ZielPruefung = {},
): Promise<{ ok: true; url: URL } | { ok: false; grund: string }> {
  let url: URL;
  try {
    url = new URL(roh.includes("://") ? roh : `https://${roh}`);
  } catch {
    return { ok: false, grund: "Keine gültige Adresse." };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, grund: "Nur http und https sind erlaubt." };
  }

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();

  // Direkt angegebene IP: ohne DNS pruefen.
  if (isIP(host)) {
    if (istPrivateIp(host) && !(optionen.erlaubeLoopback && istLoopback(host))) {
      return { ok: false, grund: "Interne Adressen sind gesperrt." };
    }
    return { ok: true, url };
  }

  if (host === "localhost" || host.endsWith(".localhost")) {
    return optionen.erlaubeLoopback
      ? { ok: true, url }
      : { ok: false, grund: "Interne Adressen sind gesperrt." };
  }

  let adressen: { address: string }[];
  try {
    adressen = await lookup(host, { all: true });
  } catch {
    return { ok: false, grund: "Adresse ließ sich nicht auflösen." };
  }
  if (adressen.length === 0) return { ok: false, grund: "Adresse ließ sich nicht auflösen." };

  // Alle Antworten müssen sauber sein, sonst greift DNS-Rebinding.
  for (const { address } of adressen) {
    if (istPrivateIp(address) && !(optionen.erlaubeLoopback && istLoopback(address))) {
      return { ok: false, grund: "Die Adresse zeigt auf ein internes Netz." };
    }
  }

  return { ok: true, url };
}

function istLoopback(ip: string): boolean {
  return ip === "::1" || ip.startsWith("127.");
}
