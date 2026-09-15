"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { CopyButton } from "@/components/CopyButton";
import { HealthBanner } from "@/components/HealthBanner";
import { LiveListener } from "@/components/LiveListener";
import { NotesPanel } from "@/components/NotesPanel";
import { Progress } from "@/components/Progress";
import { SettingsPanel } from "@/components/SettingsPanel";
import { Stepper } from "@/components/Stepper";
import { CALENDLY_LABEL, CALENDLY_URL, STEPS } from "@/data/script";
import type { HealthState } from "@/lib/health";
import { createLocalStore } from "@/lib/localStore";
import { settingsFuerRequest, type Settings } from "@/lib/settings";

const notizStore = createLocalStore("anruf-assistent.notizen", "");
const settingsStore = createLocalStore("anruf-assistent.settings", "{}");

type Panel = "keins" | "notizen" | "einstellungen";

export default function Page() {
  const [stepIndex, setStepIndex] = useState(0);
  const [variantId, setVariantId] = useState(STEPS[0].variants?.[0].id ?? "");
  const [health, setHealth] = useState<HealthState | null>(null);
  const [panel, setPanel] = useState<Panel>("keins");

  // Notizen und Einstellungen bleiben allein in diesem Browser.
  const notizen = useSyncExternalStore(
    notizStore.subscribe,
    notizStore.getSnapshot,
    notizStore.getServerSnapshot,
  );
  const settingsRoh = useSyncExternalStore(
    settingsStore.subscribe,
    settingsStore.getSnapshot,
    settingsStore.getServerSnapshot,
  );
  const settings = useMemo<Partial<Settings>>(() => {
    try {
      return JSON.parse(settingsRoh) as Partial<Settings>;
    } catch {
      return {};
    }
  }, [settingsRoh]);

  const pruefeVerbindung = useCallback((aktuelle: Partial<Settings>) => {
    fetch("/api/health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: settingsFuerRequest(aktuelle) }),
      cache: "no-store",
    })
      .then((res) => res.json() as Promise<HealthState>)
      .then(setHealth)
      .catch(() =>
        setHealth({
          ok: false,
          modelFound: false,
          provider: "ollama",
          model: "",
          cloud: false,
        }),
      );
  }, []);

  useEffect(() => {
    pruefeVerbindung(settings);
    // Nur beim ersten Laden — spaetere Aenderungen loesen die Pruefung selbst aus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pruefeVerbindung]);

  const notizenSetzen = (wert: string) => notizStore.set(wert);

  const settingsSetzen = (neu: Partial<Settings>) => {
    settingsStore.set(JSON.stringify(neu));
    pruefeVerbindung(neu);
  };

  return (
    <main className="app">
      <header className="header">
        <h1>Anruf-Assistent</h1>
        <Progress index={stepIndex} total={STEPS.length} />
        <nav className="kopf-aktionen">
          <button
            type="button"
            className="link-btn"
            aria-pressed={panel === "notizen"}
            onClick={() => setPanel((p) => (p === "notizen" ? "keins" : "notizen"))}
          >
            Notizen{notizen.trim() ? " ●" : ""}
          </button>
          <button
            type="button"
            className="link-btn"
            aria-pressed={panel === "einstellungen"}
            onClick={() => setPanel((p) => (p === "einstellungen" ? "keins" : "einstellungen"))}
          >
            Einstellungen
          </button>
        </nav>
      </header>

      {panel === "notizen" && (
        <NotesPanel notizen={notizen} onNotizenChange={notizenSetzen} settings={settings} />
      )}
      {panel === "einstellungen" && (
        <SettingsPanel settings={settings} onChange={settingsSetzen} />
      )}

      <HealthBanner health={health} />

      <div className="spalten">
        <section className="spalte">
          <Stepper
            index={stepIndex}
            onIndexChange={setStepIndex}
            variantId={variantId}
            onVariantChange={setVariantId}
          />
        </section>

        <section className="spalte spalte--seite">
          <LiveListener notizen={notizen} settings={settings} />
        </section>
      </div>

      <footer className="footer">
        <a href={CALENDLY_URL} target="_blank" rel="noreferrer">
          {CALENDLY_LABEL}
        </a>
        <CopyButton text={CALENDLY_URL} />
      </footer>
    </main>
  );
}
