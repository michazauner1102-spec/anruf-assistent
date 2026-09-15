import { OBJECTIONS, type Objection } from "@/data/objections";

/**
 * Keyword-Scoring ueber den hinterlegten Suchtext:
 *  - je Wort der Eingabe, das im Suchtext vorkommt: +1
 *  - komplette Eingabe als Teilstring im Suchtext: +3
 * Nur Treffer mit Score > 0, absteigend sortiert.
 */
export function scoreObjections(query: string): Objection[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const words = q.split(/\s+/).filter(Boolean);

  return OBJECTIONS.map((objection) => {
    const haystack = objection.search.toLowerCase();
    let score = words.reduce((sum, word) => (haystack.includes(word) ? sum + 1 : sum), 0);
    if (haystack.includes(q)) score += 3;
    return { objection, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.objection);
}

/**
 * Fuellwoerter, die in gesprochener Sprache staendig vorkommen und sonst
 * quer durch alle Einwaende Zufallstreffer erzeugen.
 */
const FUELLWOERTER = new Set([
  "ich", "du", "sie", "wir", "er", "es", "der", "die", "das", "den", "dem", "des",
  "ein", "eine", "einen", "einem", "einer", "und", "oder", "aber", "doch", "ja",
  "nein", "also", "halt", "mal", "so", "noch", "auch", "dann", "denn", "eigentlich",
  "ist", "sind", "war", "habe", "hab", "haben", "hat", "bin", "sein", "wird", "werden",
  "mir", "mich", "ihnen", "ihre", "ihr", "uns", "auf", "mit", "von", "zu", "im", "am",
  "an", "bei", "um", "was", "wie", "wo", "wer", "hier", "dafür", "damit", "wirklich",
  "einfach", "schon", "sehr", "ganz", "etwas", "man", "dass", "weil", "für", "über",
  "aus", "guten", "tag", "hallo", "herr", "frau", "danke", "bitte", "okay", "gut",
  "mehr", "immer", "gerne", "vielleicht", "eher", "würde", "könnte", "sagen",
  // Alltagswoerter, die zufaellig nur in EINER Kategorie stehen und deshalb
  // sonst faelschlich als starkes Signal durchgehen ("gerade im Auto" -> Zeit).
  "gerade", "viel", "nur", "sich", "meine", "mein", "paar", "jetzt", "kurz", "wieder",
  // Negationen: stehen in jedem zweiten Satz und duerfen niemals allein
  // einen Einwand ausloesen.
  "nicht", "kein", "keine", "keinen", "keiner", "nichts", "gar", "wohl", "leider",
]);

/** Nur die juengsten Woerter zaehlen — sonst sammelt sich ueber das Gespraech Rauschen an. */
const SPRACH_FENSTER = 20;
const MIN_SCORE = 2;

export interface SpeechMatch {
  objection: Objection;
  score: number;
  /** Woerter, die den Treffer ausgeloest haben — macht die Erkennung nachvollziehbar. */
  ausloeser: string[];
}

function zerlege(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\wäöüß\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Wortmengen statt Teilstring-Suche. Entscheidend: "auto" darf NICHT in
 * "automatisierung" treffen und "mein" nicht in "meine" — sonst loest ein
 * belangloser Satz mitten im Gespraech einen Einwand aus.
 */
const WORTE_PRO_EINWAND = OBJECTIONS.map((o) => new Set(zerlege(o.search)));

const gewichtCache = new Map<string, number>();

/**
 * Trennschaerfe eines Wortes: kommt es nur in einer Kategorie vor, ist es ein
 * starkes Signal ("crm", "kosten", "zeit") und zaehlt doppelt. Streut es ueber
 * mehrere Kategorien ("kein", "nicht"), ist es schwach.
 */
function gewicht(wort: string): number {
  const gemerkt = gewichtCache.get(wort);
  if (gemerkt !== undefined) return gemerkt;

  const kategorien = new Set<string>();
  OBJECTIONS.forEach((objection, i) => {
    if (WORTE_PRO_EINWAND[i].has(wort)) kategorien.add(objection.category);
  });
  const wert = kategorien.size === 0 ? 0 : kategorien.size === 1 ? 2 : 1;
  gewichtCache.set(wort, wert);
  return wert;
}

/**
 * Trefferlogik fuer gesprochene Sprache. Strenger als scoreObjections():
 * Fuellwoerter fliegen raus, nur das juengste Gespraechsfenster zaehlt, Woerter
 * werden nach Trennschaerfe gewichtet — und unterhalb von MIN_SCORE wird bewusst
 * NICHTS angezeigt. Ein falscher Vorschlag im Gespraech ist schlimmer als keiner.
 */
export function matchFromSpeech(transcript: string): SpeechMatch | null {
  const woerter = [
    ...new Set(
      zerlege(transcript)
        .slice(-SPRACH_FENSTER)
        .filter((w) => w.length >= 3 && !FUELLWOERTER.has(w)),
    ),
  ];

  if (woerter.length === 0) return null;

  let bester: SpeechMatch | null = null;

  OBJECTIONS.forEach((objection, i) => {
    const ausloeser = woerter.filter((w) => WORTE_PRO_EINWAND[i].has(w));
    const score = ausloeser.reduce((summe, w) => summe + gewicht(w), 0);
    // Bei Gleichstand gewinnt der frueher definierte Eintrag. Spezifischere
    // Einwaende deshalb weiter oben einsortieren als allgemeinere.
    if (score >= MIN_SCORE && (!bester || score > bester.score)) {
      bester = { objection, score, ausloeser };
    }
  });

  return bester;
}
