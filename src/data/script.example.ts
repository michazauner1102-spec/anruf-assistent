import { PROFILE } from "./profile";

export const GOAL_BADGE = `Ziel: ${PROFILE.ziel} · Anrede: Sie`;

export interface StepVariant {
  id: string;
  label: string;
  lines: string[];
}

export interface Step {
  n: number;
  title: string;
  lines?: string[];
  variants?: StepVariant[];
  hint?: string;
}

/**
 * Beispiel-Gesprächsablauf, bewusst branchenneutral. Aufbau: erst die Lücke
 * sichtbar machen, dann erst pitchen. Text in [eckigen Klammern] hebt das UI
 * als Einsetzstelle hervor.
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
      "Wie viele [Anfragen] bekommen Sie aktuell pro Woche ungefähr, und wie viele davon werden wirklich zu [Aufträgen]?",
    ],
    hint: "Ziel: Lücke identifizieren. Große Differenz heißt: Pain vorhanden.",
  },
  {
    n: 3,
    title: "Pain-Frage",
    lines: [
      "Passiert es Ihnen, dass [Anfragen] reinkommen, während Sie gerade beim Kunden sind, und wenn Sie dann zurückrufen, ist der Interessent schon woanders?",
    ],
    hint: "Wenn ja: kurz bestätigen lassen. Nicht weiterreden.",
  },
  {
    n: 4,
    title: "Mini-Pitch (30 Sek.)",
    lines: [
      `Genau das lösen wir. ${PROFILE.angebot} Das läuft auf Ihren eigenen Accounts und gehört Ihnen.`,
    ],
    hint: "Nur wenn im Schritt davor Pain bestätigt wurde.",
  },
  {
    n: 5,
    title: "CTA — der einzige Schritt",
    lines: [
      `Ich biete Ihnen ${PROFILE.ziel} an, kein Verkaufsgespräch, nur schauen ob das bei Ihnen Sinn macht. Wann passt Ihnen diese Woche, Dienstag oder Donnerstag?`,
    ],
    hint: "→ Termin fixieren, Einladung direkt raus.",
  },
];

export const step = (n: number): Step => {
  const found = STEPS.find((s) => s.n === n);
  if (!found) throw new Error(`Schritt ${n} existiert nicht`);
  return found;
};

export interface SimpleCard {
  title: string;
  lines: string[];
  hint?: string;
}

export const VOICEMAIL_CARDS: SimpleCard[] = [
  {
    title: "Voicemail",
    lines: [
      `Hallo [Name], hier ${PROFILE.person} von ${PROFILE.firma}. Ich rufe wegen ${PROFILE.ziel} an — melde mich in den nächsten Tagen. Schönen Tag.`,
    ],
  },
  {
    title: "Vorzimmer",
    lines: [
      `Ich versuche, [Name] zu erreichen — es geht um einen Termin für ${PROFILE.ziel}. Kurz zu sprechen?`,
    ],
  },
];

export const CHECKLIST: string[] = [
  "Termin-Einladung sofort verschickt",
  "Antwort aus der Qualifizierungsfrage notiert",
  "Ergebnis im CRM vermerkt, Status aktualisiert",
  "Falls kein Termin: Follow-up-Mail oder nächster Anrufzeitpunkt eingetragen",
];
