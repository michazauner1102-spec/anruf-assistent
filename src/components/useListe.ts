"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { createLocalStore } from "@/lib/localStore";
import {
  aktiverKontakt,
  ladeListe,
  LEERE_LISTE,
  naechsterOffener,
  neuerKontakt,
  type Kontakt,
  type Liste,
} from "@/lib/liste";
import type { Anrede } from "@/lib/platzhalter";

const listeStore = createLocalStore("anruf-assistent.liste", "");

/**
 * Bis hierher lagen Notizen, Briefing, Name, Anrede und das zugeschnittene
 * Skript als Einzelwerte im Browser. Beim ersten Start mit Liste werden sie
 * in den ersten Kontakt uebernommen, damit ein laufender Arbeitsstand nicht
 * verloren geht.
 */
function migrieren() {
  if (typeof window === "undefined") return;
  if (listeStore.getSnapshot()) return;

  const alt = (schluessel: string) => {
    try {
      return window.localStorage.getItem(schluessel) ?? "";
    } catch {
      return "";
    }
  };

  const felder = {
    name: alt("anruf-assistent.kontakt"),
    anrede: alt("anruf-assistent.anrede") as Anrede,
    notizen: alt("anruf-assistent.notizen"),
    briefing: alt("anruf-assistent.briefing"),
    skriptAngepasst: alt("anruf-assistent.skript-angepasst"),
  };

  // Gibt es nichts zu übernehmen, bleibt die Liste leer — sonst stünde dort ein
  // leerer Eintrag "ohne Namen" herum.
  const etwasDa = Object.values(felder).some((wert) => wert.trim() !== "");
  if (!etwasDa) {
    listeStore.set(JSON.stringify(LEERE_LISTE));
    return;
  }

  const erster = neuerKontakt(felder);
  listeStore.set(JSON.stringify({ kontakte: [erster], aktivId: erster.id } satisfies Liste));
}

migrieren();

export function useListe() {
  const roh = useSyncExternalStore(
    listeStore.subscribe,
    listeStore.getSnapshot,
    listeStore.getServerSnapshot,
  );

  const liste = useMemo(() => (roh ? ladeListe(roh) : LEERE_LISTE), [roh]);
  const aktiv = useMemo(() => aktiverKontakt(liste), [liste]);

  const schreiben = useCallback((neu: Liste) => {
    listeStore.set(JSON.stringify(neu));
  }, []);

  const setzeAktiv = useCallback(
    (id: string) => schreiben({ ...liste, aktivId: id }),
    [liste, schreiben],
  );

  /** Aendert Felder des aktiven Kontakts. Legt einen an, falls die Liste leer ist. */
  const aendereAktiven = useCallback(
    (teil: Partial<Kontakt>) => {
      if (!aktiv) {
        const erster = neuerKontakt(teil);
        schreiben({ kontakte: [erster], aktivId: erster.id });
        return;
      }
      schreiben({
        ...liste,
        kontakte: liste.kontakte.map((k) => (k.id === aktiv.id ? { ...k, ...teil } : k)),
      });
    },
    [aktiv, liste, schreiben],
  );

  const aendereKontakt = useCallback(
    (id: string, teil: Partial<Kontakt>) =>
      schreiben({
        ...liste,
        kontakte: liste.kontakte.map((k) => (k.id === id ? { ...k, ...teil } : k)),
      }),
    [liste, schreiben],
  );

  const ergaenzen = useCallback(
    (neue: Kontakt[]) => {
      if (neue.length === 0) return;
      const kontakte = [...liste.kontakte, ...neue];
      schreiben({ kontakte, aktivId: liste.aktivId || neue[0].id });
    },
    [liste, schreiben],
  );

  const entfernen = useCallback(
    (id: string) => {
      const kontakte = liste.kontakte.filter((k) => k.id !== id);
      schreiben({ kontakte, aktivId: liste.aktivId === id ? (kontakte[0]?.id ?? "") : liste.aktivId });
    },
    [liste, schreiben],
  );

  const zumNaechsten = useCallback(() => {
    if (!aktiv) return false;
    const naechster = naechsterOffener(liste, aktiv.id);
    if (!naechster) return false;
    schreiben({ ...liste, aktivId: naechster.id });
    return true;
  }, [aktiv, liste, schreiben]);

  const alleLeeren = useCallback(() => schreiben(LEERE_LISTE), [schreiben]);

  return {
    liste,
    aktiv,
    setzeAktiv,
    aendereAktiven,
    aendereKontakt,
    ergaenzen,
    entfernen,
    zumNaechsten,
    alleLeeren,
  };
}
