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

  /**
   * Jede Aenderung liest den aktuellen Stand frisch aus dem Speicher, statt den
   * aus dem letzten Rendern zu nehmen. Im Stapellauf liegen zwischen zwei
   * Schreibvorgaengen Sekunden — mit dem alten Stand haette der zweite den
   * ersten ueberschrieben, und die gerade ausgelesenen Notizen waeren weg.
   */
  const aktualisieren = useCallback((aendern: (aktuell: Liste) => Liste) => {
    const gespeichert = listeStore.getSnapshot();
    listeStore.set(JSON.stringify(aendern(gespeichert ? ladeListe(gespeichert) : LEERE_LISTE)));
  }, []);

  const setzeAktiv = useCallback(
    (id: string) => aktualisieren((l) => ({ ...l, aktivId: id })),
    [aktualisieren],
  );

  /** Aendert Felder des aktiven Kontakts. Legt einen an, falls die Liste leer ist. */
  const aendereAktiven = useCallback(
    (teil: Partial<Kontakt>) =>
      aktualisieren((l) => {
        const jetztAktiv = aktiverKontakt(l);
        if (!jetztAktiv) {
          const erster = neuerKontakt(teil);
          return { kontakte: [erster], aktivId: erster.id };
        }
        return {
          ...l,
          kontakte: l.kontakte.map((k) => (k.id === jetztAktiv.id ? { ...k, ...teil } : k)),
        };
      }),
    [aktualisieren],
  );

  const aendereKontakt = useCallback(
    (id: string, teil: Partial<Kontakt>) =>
      aktualisieren((l) => ({
        ...l,
        kontakte: l.kontakte.map((k) => (k.id === id ? { ...k, ...teil } : k)),
      })),
    [aktualisieren],
  );

  const ergaenzen = useCallback(
    (neue: Kontakt[]) => {
      if (neue.length === 0) return;
      aktualisieren((l) => ({
        kontakte: [...l.kontakte, ...neue],
        aktivId: l.aktivId || neue[0].id,
      }));
    },
    [aktualisieren],
  );

  const entfernen = useCallback(
    (id: string) =>
      aktualisieren((l) => {
        const kontakte = l.kontakte.filter((k) => k.id !== id);
        return { kontakte, aktivId: l.aktivId === id ? (kontakte[0]?.id ?? "") : l.aktivId };
      }),
    [aktualisieren],
  );

  const zumNaechsten = useCallback(() => {
    if (!aktiv) return false;
    const naechster = naechsterOffener(liste, aktiv.id);
    if (!naechster) return false;
    aktualisieren((l) => ({ ...l, aktivId: naechster.id }));
    return true;
  }, [aktiv, liste, aktualisieren]);

  const alleLeeren = useCallback(() => aktualisieren(() => LEERE_LISTE), [aktualisieren]);

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
