"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { type Erkennung, fehlerText, getErkennungsKonstruktor } from "@/lib/speech";
import type { Zug } from "@/lib/conversation";

/** So viel Gesprochenes wird vorgehalten — mehr braucht die Trefferlogik nicht. */
const MAX_LAENGE = 400;

// Die Verfuegbarkeit aendert sich nie, muss aber erst im Browser ermittelt werden.
// useSyncExternalStore liefert serverseitig false und vermeidet so einen
// Hydration-Mismatch, ohne setState im Effect zu brauchen.
const nichtsAbonnieren = () => () => {};
const imBrowserVerfuegbar = () => getErkennungsKonstruktor() !== null;
const aufServer = () => false;

export type SpeechState = ReturnType<typeof useSpeechRecognition>;

export function useSpeechRecognition() {
  const unterstuetzt = useSyncExternalStore(nichtsAbonnieren, imBrowserVerfuegbar, aufServer);
  const [laeuft, setLaeuft] = useState(false);
  const [gehoert, setGehoert] = useState("");
  const [letzteAeusserung, setLetzteAeusserung] = useState("");
  const [verlauf, setVerlauf] = useState<Zug[]>([]);
  const [vorlaeufig, setVorlaeufig] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);

  const erkennungRef = useRef<Erkennung | null>(null);
  const sollLaufenRef = useRef(false);

  const stoppen = useCallback(() => {
    sollLaufenRef.current = false;
    setLaeuft(false);
    setVorlaeufig("");
    erkennungRef.current?.stop();
  }, []);

  const starten = useCallback(() => {
    const Konstruktor = getErkennungsKonstruktor();
    if (!Konstruktor) {
      setFehler("Dieser Browser kann keine Spracherkennung. Chrome verwenden.");
      return;
    }

    setFehler(null);
    sollLaufenRef.current = true;
    setLaeuft(true);

    const erkennung = new Konstruktor();
    erkennung.lang = "de-DE";
    erkennung.continuous = true;
    erkennung.interimResults = true;
    erkennung.maxAlternatives = 1;

    erkennung.onresult = (event) => {
      let neuFinal = "";
      let neuVorlaeufig = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const ergebnis = event.results[i];
        if (ergebnis.isFinal) neuFinal += ergebnis[0].transcript;
        else neuVorlaeufig += ergebnis[0].transcript;
      }
      if (neuFinal) {
        const sauber = neuFinal.trim();
        setGehoert((bisher) => `${bisher} ${sauber}`.trim().slice(-MAX_LAENGE));
        // Spracherkennung liefert keine Satzzeichen — die letzte Aeusserung laesst
        // sich deshalb nicht aus dem Gesamttext herausschneiden, sie muss hier
        // beim Eintreffen gemerkt werden.
        setLetzteAeusserung(sauber.slice(-MAX_LAENGE));
        // Gespraechsverlauf hier fuehren, nicht in einem Effect: der Zug entsteht
        // genau in diesem Callback, wenn die Erkennung einen Satz abschliesst.
        setVerlauf((bisher) => [...bisher, { rolle: "gegenueber" as const, text: sauber }].slice(-40));
      }
      setVorlaeufig(neuVorlaeufig);
    };

    erkennung.onerror = (event) => {
      // "no-speech" und "aborted" sind im Dauerbetrieb normal — nur echte
      // Probleme melden und das Zuhoeren dann auch wirklich beenden.
      if (event.error === "no-speech" || event.error === "aborted") return;
      setFehler(fehlerText(event.error));
      sollLaufenRef.current = false;
      setLaeuft(false);
    };

    // Chrome beendet die Erkennung nach kurzer Stille von selbst — neu starten,
    // solange der Nutzer das Zuhoeren nicht bewusst gestoppt hat.
    erkennung.onend = () => {
      if (!sollLaufenRef.current) return;
      try {
        erkennung.start();
      } catch {
        sollLaufenRef.current = false;
        setLaeuft(false);
      }
    };

    erkennungRef.current = erkennung;
    try {
      erkennung.start();
    } catch {
      setFehler("Spracherkennung ließ sich nicht starten.");
      sollLaufenRef.current = false;
      setLaeuft(false);
    }
  }, []);

  const zuruecksetzen = useCallback(() => {
    setGehoert("");
    setVorlaeufig("");
    setLetzteAeusserung("");
    setVerlauf([]);
  }, []);

  useEffect(
    () => () => {
      sollLaufenRef.current = false;
      erkennungRef.current?.abort();
    },
    [],
  );

  /** Fuer Zuege, die nicht aus dem Mikrofon kommen — etwa ein genutzter Vorschlag. */
  const verlaufErgaenzen = useCallback((rolle: Zug["rolle"], text: string) => {
    const sauber = text.trim();
    if (!sauber) return;
    setVerlauf((bisher) => [...bisher, { rolle, text: sauber }].slice(-40));
  }, []);

  return {
    unterstuetzt,
    laeuft,
    gehoert,
    letzteAeusserung,
    vorlaeufig,
    fehler,
    verlauf,
    verlaufErgaenzen,
    starten,
    stoppen,
    zuruecksetzen,
  };
}
