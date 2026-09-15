"use client";

/** Die Web Speech API steht nicht in den TS-DOM-Typen — hier das noetige Minimum. */
interface ErkennungsAlternative {
  transcript: string;
}
interface ErkennungsErgebnis {
  isFinal: boolean;
  0: ErkennungsAlternative;
}
export interface ErkennungsEvent {
  resultIndex: number;
  results: { length: number; [index: number]: ErkennungsErgebnis };
}
export interface ErkennungsFehler {
  error: string;
}
export interface Erkennung {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: ErkennungsEvent) => void) | null;
  onerror: ((event: ErkennungsFehler) => void) | null;
  onend: (() => void) | null;
}

type ErkennungsKonstruktor = new () => Erkennung;

export function getErkennungsKonstruktor(): ErkennungsKonstruktor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: ErkennungsKonstruktor;
    webkitSpeechRecognition?: ErkennungsKonstruktor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function fehlerText(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Mikrofon-Zugriff verweigert. Im Browser über das Schloss-Symbol in der Adressleiste erlauben.";
    case "audio-capture":
      return "Kein Mikrofon gefunden.";
    case "network":
      return "Spracherkennung ohne Netzverbindung nicht möglich.";
    default:
      return `Spracherkennung gestoppt (${code}).`;
  }
}
