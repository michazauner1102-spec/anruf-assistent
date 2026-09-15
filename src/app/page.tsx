"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ContextPanel } from "@/components/ContextPanel";
import { CopyButton } from "@/components/CopyButton";
import { HealthBanner } from "@/components/HealthBanner";
import { LiveListener } from "@/components/LiveListener";
import { NotesPanel } from "@/components/NotesPanel";
import { Progress } from "@/components/Progress";
import { SettingsPanel } from "@/components/SettingsPanel";
import { Stepper } from "@/components/Stepper";
import { useSpeechRecognition } from "@/components/useSpeechRecognition";
import { WrapUpPanel } from "@/components/WrapUpPanel";
import { CHECKLIST, STEPS } from "@/data/script";
import { PROFILE } from "@/data/profile";
import { terminLabel, terminUrl } from "@/lib/terminLink";
import { parseScript } from "@/lib/scriptParser";
import type { HealthState } from "@/lib/health";
import { createLocalStore } from "@/lib/localStore";
import { settingsFuerRequest, type Settings } from "@/lib/settings";

const notizStore = createLocalStore("anruf-assistent.notizen", "");
const settingsStore = createLocalStore("anruf-assistent.settings", "{}");
const kontextStore = createLocalStore("anruf-assistent.kontext", "");
const skriptStore = createLocalStore("anruf-assistent.skript", "");

type Panel = "keins" | "notizen" | "kontext" | "nachbereitung" | "einstellungen";

export default function Page() {
  const [stepIndex, setStepIndex] = useState(0);
  const [variantId, setVariantId] = useState(STEPS[0].variants?.[0].id ?? "");
  const [health, setHealth] = useState<HealthState | null>(null);
  const [panel, setPanel] = useState<Panel>("keins");
  const [checkliste, setCheckliste] = useState<boolean[]>(() => CHECKLIST.map(() => false));
  // Spracherkennung liegt hier, damit der Verlauf auch der Nachbereitung zur Verfügung steht.
  const speech = useSpeechRecognition();

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
  const kontext = useSyncExternalStore(
    kontextStore.subscribe,
    kontextStore.getSnapshot,
    kontextStore.getServerSnapshot,
  );
  const skriptText = useSyncExternalStore(
    skriptStore.subscribe,
    skriptStore.getSnapshot,
    skriptStore.getServerSnapshot,
  );
  // Ein eigenes Skript ersetzt den mitgelieferten Ablauf, sobald es Schritte ergibt.
  const schritte = useMemo(() => {
    const eigene = skriptText.trim() ? parseScript(skriptText) : [];
    return eigene.length > 0 ? eigene : STEPS;
  }, [skriptText]);

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

  // Einstellung schlägt die Angabe aus profile.ts.
  const termin = (settings.terminLink ?? "").trim() || PROFILE.terminLink;

  const notizenSetzen = (wert: string) => notizStore.set(wert);

  const settingsSetzen = (neu: Partial<Settings>) => {
    settingsStore.set(JSON.stringify(neu));
    pruefeVerbindung(neu);
  };

  return (
    <main className="app">
      <header className="header">
        <h1>Anruf-Assistent</h1>
        <Progress index={Math.min(stepIndex, schritte.length - 1)} total={schritte.length} />
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
            aria-pressed={panel === "kontext"}
            onClick={() => setPanel((p) => (p === "kontext" ? "keins" : "kontext"))}
          >
            Kontext{kontext.trim() || skriptText.trim() ? " ●" : ""}
          </button>
          <button
            type="button"
            className="link-btn"
            aria-pressed={panel === "nachbereitung"}
            onClick={() => setPanel((p) => (p === "nachbereitung" ? "keins" : "nachbereitung"))}
          >
            Nachbereitung{speech.verlauf.length > 0 ? ` (${speech.verlauf.length})` : ""}
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
      {panel === "kontext" && (
        <ContextPanel
          kontext={kontext}
          onKontextChange={(w) => kontextStore.set(w)}
          skript={skriptText}
          onSkriptChange={(w) => skriptStore.set(w)}
          settings={settings}
        />
      )}
      {panel === "nachbereitung" && (
        <WrapUpPanel
          verlauf={speech.verlauf}
          notizen={notizen}
          settings={settings}
          checkliste={checkliste}
          onCheckliste={(i) =>
            setCheckliste((v) => v.map((wert, idx) => (idx === i ? !wert : wert)))
          }
          onNeuesGespraech={() => {
            speech.zuruecksetzen();
            setCheckliste(CHECKLIST.map(() => false));
            setStepIndex(0);
          }}
        />
      )}
      {panel === "einstellungen" && (
        <SettingsPanel settings={settings} onChange={settingsSetzen} />
      )}

      <HealthBanner health={health} />

      <div className="spalten">
        <section className="spalte">
          <Stepper
            steps={schritte}
            index={stepIndex}
            onIndexChange={setStepIndex}
            variantId={variantId}
            onVariantChange={setVariantId}
          />
        </section>

        <section className="spalte spalte--seite">
          <LiveListener speech={speech} notizen={notizen} kontext={kontext} settings={settings} />
        </section>
      </div>

      <footer className="footer">
        {termin ? (
          <>
            <a href={terminUrl(termin)} target="_blank" rel="noreferrer">
              {terminLabel(termin)}
            </a>
            <CopyButton text={terminUrl(termin)} />
          </>
        ) : (
          <span className="empty" style={{ margin: 0 }}>
            Kein Terminlink hinterlegt — in den Einstellungen eintragen.
          </span>
        )}
      </footer>
    </main>
  );
}
