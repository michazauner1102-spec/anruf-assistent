import { PROFILE } from "./profile";

export { CALENDLY_LABEL, CALENDLY_URL } from "./profile";

export const GOAL_BADGE = "Ziel: kostenloser 30-Minuten-Prozesscheck · Anrede: Sie";

export interface StepVariant {
  id: string;
  label: string;
  lines: string[];
}

export interface Step {
  n: number;
  title: string;
  /** Gesprochener Text. Mehrere Eintraege = mehrere Saetze/Alternativen. */
  lines?: string[];
  /** Nur Schritt 1: umschaltbare Opening-Varianten. */
  variants?: StepVariant[];
  hint?: string;
}

/**
 * Aeltere Fassung mit weichem Audit-Einstieg. Wird aktuell nicht angezeigt,
 * bleibt als Alternative erhalten (FULL_SCRIPT baut darauf auf).
 */
export const STEPS_AUDIT_FOKUS: Step[] = [
  {
    n: 1,
    title: "Opening",
    variants: [
      {
        id: "mail",
        label: "Nach Mail",
        lines: [
          `Guten Tag Frau/Herr [Name], hier ${PROFILE.person} von ${PROFILE.firma}. Ich hatte Ihnen vor kurzem zu [Thema] geschrieben. Kurz gesagt: Ich möchte einen Termin für ein kostenloses Prozess-Audit vereinbaren, 30 Minuten. Passt's gerade kurz?`,
        ],
      },
      {
        id: "kalt",
        label: "Ganz kalt",
        lines: [
          `Guten Tag Frau/Herr [Name], hier ${PROFILE.person} von ${PROFILE.firma}. Offen gesagt: Ich rufe an, um einen Termin für ein kostenloses Prozess-Audit zu vereinbaren, 30 Minuten. Haben Sie kurz zwei Minuten?`,
        ],
      },
    ],
    hint: "→ Pause. Antwort abwarten.",
  },
  {
    n: 2,
    title: "Kurzer Haken",
    lines: [
      "Kurz zum Hintergrund: DSGVO-konforme KI-Automatisierung für inhabergeführte Maklerbüros, EU-gehostet, kein Lock-in. Die Systeme laufen auf Ihren eigenen Accounts.",
    ],
    hint: "Nur wenn Interesse da ist — sonst direkt zum Termin-Ask.",
  },
  {
    n: 3,
    title: "Warum gerade relevant",
    lines: [
      "Google-Bewertungen entscheiden oft mit, wer den Auftrag bekommt. Leads erwarten Reaktion in Minuten. Und beim Thema KI/Datenschutz ist noch vieles ungeklärt — genau da setzt das Audit an.",
    ],
  },
  {
    n: 4,
    title: "Termin-Ask",
    lines: [
      "Ich schau mir mit Ihnen 30 Minuten kostenlos an, wo bei Bewertungen, Leads oder Sichtbarkeit Zeit liegen bleibt — unverbindlich. Diese oder nächste Woche?",
    ],
  },
  {
    n: 5,
    title: "Terminvereinbarung",
    lines: [
      "Ich schick eine Kalendereinladung, dann kein Telefon-Tag. Passt das?",
      "[Tag] hätte ich [Zeit 1] oder [Zeit 2] — was passt besser?",
    ],
    hint: "→ Termin fixieren, Calendly-Einladung direkt raus.",
  },
  {
    n: 6,
    title: "Qualifizierungsfrage",
    lines: ["Wo brennt's bei Ihnen gerade am meisten: Bewertungen, Leads oder Sichtbarkeit?"],
    hint: "Antwort notieren — Aufhänger fürs Erstgespräch.",
  },
];

export const step = (n: number): Step => {
  const found = STEPS_AUDIT_FOKUS.find((s) => s.n === n);
  if (!found) throw new Error(`Schritt ${n} existiert nicht`);
  return found;
};

/**
 * Aktiver Gespraechsablauf: Pain-Fokus. Erst die Luecke sichtbar machen
 * (Qualifizierung + Pain-Frage), dann erst pitchen.
 */
export const STEPS: Step[] = [
  {
    n: 1,
    title: "Opener (10 Sek.)",
    lines: [
      `Guten Tag, [Vorname], ${PROFILE.person} hier von ${PROFILE.firma}. Ich spezialisiere mich auf ${PROFILE.spezialisierung}. Haben Sie 90 Sekunden?`,
    ],
    hint: "→ Pause. Antwort abwarten.",
  },
  {
    n: 2,
    title: "Qualifizierung — eine Frage",
    lines: [
      "Wie viele Anfragen bekommen Sie aktuell pro Woche ungefähr, und wie viele davon werden wirklich zu Terminen?",
    ],
    hint: "Ziel: Lücke identifizieren. „Viele Anfragen, wenig Termine“ heißt: Pain vorhanden.",
  },
  {
    n: 3,
    title: "Pain-Frage",
    lines: [
      "Passiert es Ihnen, dass Anfragen reinkommen, während Sie gerade bei einer Besichtigung sind, und wenn Sie dann zurückrufen, ist der Interessent schon woanders?",
    ],
    hint: "Wenn ja: kurz bestätigen lassen. Nicht weiterreden.",
  },
  {
    n: 4,
    title: "Mini-Pitch (30 Sek.)",
    lines: [
      "Genau das lösen wir. Wir bauen Ihnen ein System, das Anfragen sofort qualifiziert, Exposés automatisch verschickt und Termine direkt bucht, auch wenn Sie nicht erreichbar sind. Das läuft auf Ihren eigenen Accounts, EU-Server, gehört Ihnen. Ein zusätzliches Mandat deckt die Kosten für ein halbes Jahr.",
    ],
    hint: "Nur wenn im Schritt davor Pain bestätigt wurde.",
  },
  {
    n: 5,
    title: "CTA — der einzige Schritt",
    lines: [
      "Ich biete Ihnen einen kostenlosen 30-Minuten-Prozesscheck an, kein Verkaufsgespräch, nur schauen ob das bei Ihnen Sinn macht. Wann passt Ihnen diese Woche, Dienstag oder Donnerstag?",
    ],
    hint: "→ Termin fixieren, Calendly-Einladung direkt raus.",
  },
];

export interface SimpleCard {
  title: string;
  lines: string[];
  hint?: string;
}

export const VOICEMAIL_CARDS: SimpleCard[] = [
  {
    title: "Voicemail",
    lines: [
      `Hallo [Name], hier ${PROFILE.person} von ${PROFILE.firma}. Ich rufe wegen eines kostenlosen Prozess-Audits an — melde mich in den nächsten Tagen. Schönen Tag.`,
    ],
  },
  {
    title: "Gatekeeper",
    lines: [
      "Ich versuche, [Name] zu erreichen — geht um einen Termin für ein kostenloses Prozess-Audit. Kurz zu sprechen?",
    ],
  },
];

export const CHECKLIST: string[] = [
  "Calendly-Einladung sofort verschickt",
  "Antwort aus der Qualifizierungsfrage notiert",
  "Ergebnis im CRM (Close) vermerkt, Status aktualisiert",
  "Falls kein Termin: Follow-up-Mail oder nächster Anrufzeitpunkt eingetragen",
];

/** Bloecke fuer den Tab "Ganzes Skript". */
export type ScriptBlock =
  | { kind: "speech"; label?: string; lines: string[] }
  | { kind: "note"; text: string }
  | { kind: "checklist" };

export interface ScriptSection {
  n: number;
  title: string;
  blocks: ScriptBlock[];
}

/** Zieht die gesprochenen Texte aus STEPS — keine Doppelpflege. */
export const FULL_SCRIPT: ScriptSection[] = [
  {
    n: 0,
    title: "Haltung",
    blocks: [
      {
        kind: "note",
        text: "Ruhig und sachlich, nicht verkäuferisch — Sie bieten ein kostenloses Audit an, keinen Gefallen.",
      },
      { kind: "note", text: "Pausen nach jeder Frage aushalten, der Makler muss reden." },
      { kind: "note", text: "Ziel wird sofort genannt, nicht erst am Ende versteckt." },
      {
        kind: "note",
        text: "Nichts erfinden: keine Kundenzahlen, keine Erfolgsgeschichten — ehrlich bleiben mit „im Aufbau“ und „Gründungsplätze“.",
      },
    ],
  },
  {
    n: 1,
    title: "Opening",
    blocks: [
      ...step(1).variants!.map(
        (v): ScriptBlock => ({ kind: "speech", label: v.label, lines: v.lines }),
      ),
      { kind: "note", text: step(1).hint! },
    ],
  },
  {
    n: 2,
    title: "Kurzer Haken",
    blocks: [
      { kind: "speech", lines: step(2).lines! },
      {
        kind: "note",
        text: "Nur wenn Interesse/Zeit da ist — sonst direkt zum Termin-Ask. Keine Zahlen zu Kundenanzahl oder Community-Größe nennen.",
      },
    ],
  },
  {
    n: 3,
    title: "Warum's gerade relevant ist",
    blocks: [{ kind: "speech", lines: step(3).lines! }],
  },
  {
    n: 4,
    title: "Termin-Ask",
    blocks: [{ kind: "speech", lines: step(4).lines! }],
  },
  {
    n: 5,
    title: "Terminvereinbarung",
    blocks: [
      { kind: "speech", lines: step(5).lines! },
      { kind: "note", text: "→ Termin fixieren, Calendly-Einladung direkt im Anschluss verschicken." },
    ],
  },
  {
    n: 6,
    title: "Qualifizierungsfrage",
    blocks: [
      { kind: "speech", lines: step(6).lines! },
      { kind: "note", text: step(6).hint! },
      { kind: "note", text: "Einwände und Voicemail/Gatekeeper stehen in den eigenen Tabs." },
    ],
  },
  {
    n: 7,
    title: "Nach dem Call",
    blocks: [{ kind: "checklist" }],
  },
];
