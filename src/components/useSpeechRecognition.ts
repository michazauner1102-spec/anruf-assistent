"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { type Erkennung, fehlerText, getErkennungsKonstruktor } from "@/lib/speech";
import type { Zug } from "@/lib/conversation";

/** So viel Gesprochenes wird vorgehalten — mehr braucht die Trefferlogik nicht. */
const MAX_LAENGE = 400;
/** Pause vor dem Neustart, damit das Audiogeraet nicht im Sekundentakt neu gegriffen wird. */
const NEUSTART_PAUSE_MS = 400;
/** Scheitern mehrere Neustarts kurz hintereinander, stimmt etwas Grundsaetzliches. */
const MAX_SCHNELLE_NEUSTARTS = 5;

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
  const [geraet, setGeraet] = useState("");

  const erkennungRef = useRef<Erkennung | null>(null);
  const sollLaufenRef = useRef(false);
  /**
   * Ein einziger, durchgehend gehaltener Audiostrom fuer die ganze Sitzung.
   * Chrome beendet die Erkennung nach jeder Sprechpause; ohne diesen Strom
   * wuerde das Mikrofon dabei jedes Mal neu gegriffen und losgelassen. Genau
   * das zwingt das Betriebssystem, die Audio-Route neu auszuhandeln — und
   * kann ein anderes Programm, das gerade telefoniert, aus der Leitung werfen.
   */
  const stromRef = useRef<MediaStream | null>(null);
  const neustartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const schnelleNeustartsRef = useRef(0);

  const stromFreigeben = useCallback(() => {
    stromRef.current?.getTracks().forEach((spur) => spur.stop());
    stromRef.current = null;
  }, []);

  const stoppen = useCallback(() => {
    sollLaufenRef.current = false;
    setLaeuft(false);
    setVorlaeufig("");
    if (neustartTimerRef.current) {
      clearTimeout(neustartTimerRef.current);
      neustartTimerRef.current = null;
    }
    erkennungRef.current?.stop();
    stromFreigeben();
  }, [stromFreigeben]);

  const starten = useCallback(async () => {
    const Konstruktor = getErkennungsKonstruktor();
    if (!Konstruktor) {
      setFehler("Dieser Browser kann keine Spracherkennung. Chrome verwenden.");
      return;
    }

    setFehler(null);
    schnelleNeustartsRef.current = 0;

    // Gerät einmal greifen und halten, statt es bei jedem Neustart neu zu belegen.
    try {
      stromRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const geraete = await navigator.mediaDevices.enumerateDevices();
      const benutzt =
        geraete.find((g) => g.kind === "audioinput" && g.deviceId === "default") ??
        geraete.find((g) => g.kind === "audioinput");
      setGeraet(benutzt?.label ?? "");
    } catch {
      setFehler(
        "Kein Zugriff aufs Mikrofon. Im Browser über das Schloss-Symbol in der Adressleiste erlauben.",
      );
      return;
    }

    sollLaufenRef.current = true;
    setLaeuft(true);

    const erkennung = new Konstruktor();
    erkennung.lang = "de-DE";
    erkennung.continuous = true;
    erkennung.interimResults = true;
    erkennung.maxAlternatives = 1;

    erkennung.onresult = (event) => {
      schnelleNeustartsRef.current = 0;
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
        setVerlauf((bisher) =>
          [...bisher, { rolle: "gegenueber" as const, text: sauber }].slice(-40),
        );
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
      stromFreigeben();
    };

    // Chrome beendet die Erkennung nach kurzer Stille von selbst. Neu starten,
    // aber mit Pause — sonst hämmert die Seite auf das Audiogeraet ein.
    erkennung.onend = () => {
      if (!sollLaufenRef.current) return;

      schnelleNeustartsRef.current += 1;
      if (schnelleNeustartsRef.current > MAX_SCHNELLE_NEUSTARTS) {
        setFehler(
          "Die Spracherkennung bricht immer wieder ab. Belegt ein anderes Programm dasselbe Mikrofon?",
        );
        sollLaufenRef.current = false;
        setLaeuft(false);
        stromFreigeben();
        return;
      }

      neustartTimerRef.current = setTimeout(() => {
        if (!sollLaufenRef.current) return;
        try {
          erkennung.start();
        } catch {
          sollLaufenRef.current = false;
          setLaeuft(false);
          stromFreigeben();
        }
      }, NEUSTART_PAUSE_MS);
    };

    erkennungRef.current = erkennung;
    try {
      erkennung.start();
    } catch {
      setFehler("Spracherkennung ließ sich nicht starten.");
      sollLaufenRef.current = false;
      setLaeuft(false);
      stromFreigeben();
    }
  }, [stromFreigeben]);

  const zuruecksetzen = useCallback(() => {
    setGehoert("");
    setVorlaeufig("");
    setLetzteAeusserung("");
    setVerlauf([]);
  }, []);

  /** Fuer Zuege, die nicht aus dem Mikrofon kommen — etwa ein genutzter Vorschlag. */
  const verlaufErgaenzen = useCallback((rolle: Zug["rolle"], text: string) => {
    const sauber = text.trim();
    if (!sauber) return;
    setVerlauf((bisher) => [...bisher, { rolle, text: sauber }].slice(-40));
  }, []);

  useEffect(
    () => () => {
      sollLaufenRef.current = false;
      if (neustartTimerRef.current) clearTimeout(neustartTimerRef.current);
      erkennungRef.current?.abort();
      stromRef.current?.getTracks().forEach((spur) => spur.stop());
      stromRef.current = null;
    },
    [],
  );

  return {
    unterstuetzt,
    laeuft,
    gehoert,
    letzteAeusserung,
    vorlaeufig,
    fehler,
    geraet,
    verlauf,
    verlaufErgaenzen,
    starten,
    stoppen,
    zuruecksetzen,
  };
}
