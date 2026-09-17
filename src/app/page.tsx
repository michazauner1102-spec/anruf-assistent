"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ContextPanel } from "@/components/ContextPanel";
import { CopyButton } from "@/components/CopyButton";
import { HealthBanner } from "@/components/HealthBanner";
import { LiveListener } from "@/components/LiveListener";
import { NotesPanel } from "@/components/NotesPanel";
import { Progress } from "@/components/Progress";
import { ScriptPanel } from "@/components/ScriptPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { Stepper } from "@/components/Stepper";
import { useSpeechRecognition } from "@/components/useSpeechRecognition";
import { WrapUpPanel } from "@/components/WrapUpPanel";
import { CHECKLIST, STEPS } from "@/data/script";
import { PROFILE } from "@/data/profile";
import { platzhalterAusName, type Anrede } from "@/lib/platzhalter";
import { terminLabel, terminUrl } from "@/lib/terminLink";
import { parseScript, scriptToText } from "@/lib/scriptParser";
import type { HealthState } from "@/lib/health";
import { createLocalStore } from "@/lib/localStore";
import { settingsFuerRequest, type Settings } from "@/lib/settings";

const notizStore = createLocalStore("anruf-assistent.notizen", "");
const settingsStore = createLocalStore("anruf-assistent.settings", "{}");
const kontextStore = createLocalStore("anruf-assistent.kontext", "");
const skriptStore = createLocalStore("anruf-assistent.skript", "");
const briefingStore = createLocalStore("anruf-assistent.briefing", "");
const kontaktStore = createLocalStore("anruf-assistent.kontakt", "");
// Auf den Gesprächspartner zugeschnittene Fassung — liegt ÜBER dem Basis-Skript,
// damit die Basis beim nächsten Anruf unverändert dasteht.
const angepasstStore = createLocalStore("anruf-assistent.skript-angepasst", "");
const anredeStore = createLocalStore("anruf-assistent.anrede", "");

type Panel = "keins" | "notizen" | "skript" | "kontext" | "nachbereitung" | "einstellungen";

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
  const briefing = useSyncExternalStore(
    briefingStore.subscribe,
    briefingStore.getSnapshot,
    briefingStore.getServerSnapshot,
  );
  const kontakt = useSyncExternalStore(
    kontaktStore.subscribe,
    kontaktStore.getSnapshot,
    kontaktStore.getServerSnapshot,
  );
  const anrede = useSyncExternalStore(
    anredeStore.subscribe,
    anredeStore.getSnapshot,
    anredeStore.getServerSnapshot,
  ) as Anrede;
  const skriptText = useSyncExternalStore(
    skriptStore.subscribe,
    skriptStore.getSnapshot,
    skriptStore.getServerSnapshot,
  );
  const angepasst = useSyncExternalStore(
    angepasstStore.subscribe,
    angepasstStore.getSnapshot,
    angepasstStore.getServerSnapshot,
  );
  // Ein eigenes Skript ersetzt den mitgelieferten Ablauf, sobald es Schritte ergibt.
  // Reihenfolge: angepasste Fassung, sonst eigenes Skript, sonst das mitgelieferte.
  const schritte = useMemo(() => {
    for (const text of [angepasst, skriptText]) {
      const geparst = text.trim() ? parseScript(text) : [];
      if (geparst.length > 0) return geparst;
    }
    return STEPS;
  }, [angepasst, skriptText]);

  // Was "Skript anpassen" als Grundlage nimmt: eigenes Skript, sonst das mitgelieferte.
  const basisSkript = useMemo(
    () => skriptText.trim() || scriptToText(STEPS),
    [skriptText],
  );

  const platzhalter = useMemo(() => platzhalterAusName(kontakt, anrede), [kontakt, anrede]);

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

  // Pfeiltasten blättern durch das Skript — aber nie, während irgendwo getippt wird.
  useEffect(() => {
    const letzter = schritte.length - 1;

    const beiTaste = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const ziel = e.target as HTMLElement | null;
      const tippt =
        !!ziel &&
        (ziel.tagName === "INPUT" ||
          ziel.tagName === "TEXTAREA" ||
          ziel.tagName === "SELECT" ||
          ziel.isContentEditable);
      if (tippt) return;

      e.preventDefault();
      setStepIndex((i) =>
        e.key === "ArrowRight" ? Math.min(i + 1, letzter) : Math.max(i - 1, 0),
      );
    };

    window.addEventListener("keydown", beiTaste);
    return () => window.removeEventListener("keydown", beiTaste);
  }, [schritte.length]);

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
            Notizen{notizen.trim() ? (briefing.trim() ? " ✓" : " ●") : ""}
          </button>
          <button
            type="button"
            className="link-btn"
            aria-pressed={panel === "skript"}
            onClick={() => setPanel((p) => (p === "skript" ? "keins" : "skript"))}
          >
            Skript{angepasst.trim() ? ` ✦ ${schritte.length}` : skriptText.trim() ? ` (${schritte.length})` : ""}
          </button>
          <button
            type="button"
            className="link-btn"
            aria-pressed={panel === "kontext"}
            onClick={() => setPanel((p) => (p === "kontext" ? "keins" : "kontext"))}
          >
            Kontext{kontext.trim() ? " ●" : ""}
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
        <NotesPanel
          notizen={notizen}
          onNotizenChange={notizenSetzen}
          briefing={briefing}
          onBriefingChange={(w) => briefingStore.set(w)}
          kontakt={kontakt}
          onKontaktChange={(w) => kontaktStore.set(w)}
          anrede={anrede}
          onAnredeChange={(w) => anredeStore.set(w)}
          kontext={kontext}
          basisSkript={basisSkript}
          onAngepasstChange={(w) => angepasstStore.set(w)}
          onZumSkript={() => setPanel("skript")}
          settings={settings}
        />
      )}
      {panel === "skript" && (
        <ScriptPanel
          skript={skriptText}
          onSkriptChange={(w) => skriptStore.set(w)}
          angepasst={angepasst}
          onAngepasstChange={(w) => angepasstStore.set(w)}
          briefing={briefing}
          notizen={notizen}
          settings={settings}
        />
      )}
      {panel === "kontext" && (
        <ContextPanel
          kontext={kontext}
          onKontextChange={(w) => kontextStore.set(w)}
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
            angepasstStore.set("");
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
            werte={platzhalter}
            index={stepIndex}
            onIndexChange={setStepIndex}
            variantId={variantId}
            onVariantChange={setVariantId}
          />
        </section>

        <section className="spalte spalte--seite">
          <LiveListener
            speech={speech}
            notizen={notizen}
            briefing={briefing}
            kontext={kontext}
            settings={settings}
          />
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
