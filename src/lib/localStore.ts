"use client";

/**
 * Minimaler Store auf localStorage. Existiert, damit React die Werte ueber
 * useSyncExternalStore lesen kann: serverseitig der Fallback, im Browser der
 * gespeicherte Wert — ohne setState im Effect und ohne Hydration-Mismatch.
 */
type Zuhoerer = () => void;

export interface LocalStore {
  subscribe: (z: Zuhoerer) => () => void;
  getSnapshot: () => string;
  getServerSnapshot: () => string;
  set: (wert: string) => void;
}

export function createLocalStore(schluessel: string, fallback = ""): LocalStore {
  let cache: string | null = null;
  const zuhoerer = new Set<Zuhoerer>();

  const lesen = (): string => {
    if (cache === null) {
      try {
        cache = window.localStorage.getItem(schluessel) ?? fallback;
      } catch {
        cache = fallback;
      }
    }
    return cache;
  };

  return {
    subscribe(z) {
      zuhoerer.add(z);
      return () => {
        zuhoerer.delete(z);
      };
    },
    // Muss einen stabilen Wert liefern, sonst rendert React endlos.
    getSnapshot: lesen,
    getServerSnapshot: () => fallback,
    set(wert) {
      cache = wert;
      try {
        window.localStorage.setItem(schluessel, wert);
      } catch {
        // Privater Modus — der Wert gilt dann nur fuer diese Sitzung.
      }
      zuhoerer.forEach((z) => z());
    },
  };
}
