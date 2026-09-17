"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ContextPanel } from "@/components/ContextPanel";
import { CopyButton } from "@/components/CopyButton";
import { HealthBanner } from "@/components/HealthBanner";
import { ListPanel } from "@/components/ListPanel";
import { LiveListener } from "@/components/LiveListener";
import { NotesPanel } from "@/components/NotesPanel";
import { Progress } from "@/components/Progress";
import { ScriptPanel } from "@/components/ScriptPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { StatsPanel } from "@/components/StatsPanel";
import { Stepper } from "@/components/Stepper";
import { useListe } from "@/components/useListe";
import { useSpeechRecognition } from "@/components/useSpeechRecognition";
import { WrapUpPanel } from "@/components/WrapUpPanel";
import { CHECKLIST, STEPS } from "@/data/script";
import { PROFILE } from "@/data/profile";
import type { HealthState } from "@/lib/health";
import { createLocalStore } from "@/lib/localStore";
import { platzhalterAusName, type Anrede } from "@/lib/platzhalter";
import { ladeProtokoll, MAX_PROTOKOLLE, type Anrufprotokoll } from "@/lib/protokoll";
import { parseScript, scriptToText } from "@/lib/scriptParser";
import { settingsFuerRequest, type Settings } from "@/lib/settings";
import { ladeSignale } from "@/lib/signale";
import { terminLabel, terminUrl } from "@/lib/terminLink";

// Global: gilt für alle Anrufe. Alles Kontaktbezogene liegt in der Liste.
const settingsStore = createLocalStore("anruf-assistent.settings", "{}");
const kontextStore = createLocalStore("anruf-assistent.kontext", "");
const skriptStore = createLocalStore("anruf-assistent.skript", "");
const protokollStore = createLocalStore("anruf-assistent.protokoll", "[]");
const signaleStore = createLocalStore("anruf-assistent.signale", "[]");

type Panel = "keins" | "liste" | "notizen" | "nachbereitung" | "einrichten";
type Einrichten = "skript" | "kontext" | "statistik" | "einstellungen";

export default function Page() {
  const [stepIndex, setStepIndex] = useState(0);
  const [variantId, setVariantId] = useState(STEPS[0].variants?.[0].id ?? "");
  const [health, setHealth] = useState<HealthState | null>(null);
  const [panel, setPanel] = useState<Panel>("keins");
  const [einrichten, setEinrichten] = useState<Einrichten>("skript");
  const [checkliste, setCheckliste] = useState<boolean[]>(() => CHECKLIST.map(() => false));
  /** Einwände dieses Gesprächs — Grundlage der Auswertung. */
  const [erkannteEinwaende, setErkannteEinwaende] = useState<string[]>([]);
  const [protokollIndex, setProtokollIndex] = useState<number | null>(null);

  const speech = useSpeechRecognition();
  const { liste, aktiv, setzeAktiv, aendereAktiven, aendereKontakt, ergaenzen, entfernen, zumNaechsten, alleLeeren } =
    useListe();

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
  const protokollRoh = useSyncExternalStore(
    protokollStore.subscribe,
    protokollStore.getSnapshot,
    protokollStore.getServerSnapshot,
  );
  const signaleRoh = useSyncExternalStore(
    signaleStore.subscribe,
    signaleStore.getSnapshot,
    signaleStore.getServerSnapshot,
  );

  const settings = useMemo<Partial<Settings>>(() => {
    try {
      return JSON.parse(settingsRoh) as Partial<Settings>;
    } catch {
      return {};
    }
  }, [settingsRoh]);
  const protokolle = useMemo(() => ladeProtokoll(protokollRoh), [protokollRoh]);
  // Gilt für jede Website — nicht für einen einzelnen Kontakt.
  const signale = useMemo(() => ladeSignale(signaleRoh), [signaleRoh]);
  const signaleSetzen = useCallback(
    (neu: string[]) => signaleStore.set(JSON.stringify(neu)),
    [],
  );

  // Felder des aktiven Kontakts
  const notizen = aktiv?.notizen ?? "";
  const briefing = aktiv?.briefing ?? "";
  const kontaktName = aktiv?.name ?? "";
  const anrede = (aktiv?.anrede ?? "") as Anrede;
  const angepasst = aktiv?.skriptAngepasst ?? "";

  // Reihenfolge: zugeschnittene Fassung, sonst eigenes Skript, sonst das mitgelieferte.
  const schritte = useMemo(() => {
    for (const text of [angepasst, skriptText]) {
      const geparst = text.trim() ? parseScript(text) : [];
      if (geparst.length > 0) return geparst;
    }
    return STEPS;
  }, [angepasst, skriptText]);

  const basisSkript = useMemo(() => skriptText.trim() || scriptToText(STEPS), [skriptText]);
  const platzhalter = useMemo(
    () => platzhalterAusName(kontaktName, anrede),
    [kontaktName, anrede],
  );

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
        setHealth({ ok: false, modelFound: false, provider: "ollama", model: "", cloud: false }),
      );
  }, []);

  useEffect(() => {
    pruefeVerbindung(settings);
    // Nur beim ersten Laden — spätere Änderungen lösen die Prüfung selbst aus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pruefeVerbindung]);

  const termin = (settings.terminLink ?? "").trim() || PROFILE.terminLink;

  // Pfeiltasten blättern durch das Skript — aber nie, während irgendwo getippt wird.
  useEffect(() => {
    const letzter = schritte.length - 1;
    const beiTaste = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const ziel = e.target as HTMLElement | null;
      if (
        ziel &&
        (ziel.tagName === "INPUT" ||
          ziel.tagName === "TEXTAREA" ||
          ziel.tagName === "SELECT" ||
          ziel.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      setStepIndex((i) => (e.key === "ArrowRight" ? Math.min(i + 1, letzter) : Math.max(i - 1, 0)));
    };
    window.addEventListener("keydown", beiTaste);
    return () => window.removeEventListener("keydown", beiTaste);
  }, [schritte.length]);

  const einwandErkannt = useCallback((id: string) => {
    setErkannteEinwaende((bisher) => (bisher.includes(id) ? bisher : [...bisher, id]));
  }, []);

  /** Ergebnis festhalten: am Kontakt und im Protokoll für die Auswertung. */
  const ergebnisSetzen = (ergebnis: string) => {
    aendereAktiven({ ergebnis });
    if (!ergebnis) return;

    const eintrag: Anrufprotokoll = {
      zeit: Date.now(),
      firma: aktiv?.firma || aktiv?.name || "",
      ergebnis,
      einwaende: erkannteEinwaende,
      schritt: Math.min(stepIndex, schritte.length - 1) + 1,
      schritteGesamt: schritte.length,
    };

    const bisher = protokolle;
    if (protokollIndex !== null && bisher[protokollIndex]) {
      // Ergebnis korrigiert statt neuen Anruf erfasst.
      protokollStore.set(
        JSON.stringify(bisher.map((p, i) => (i === protokollIndex ? eintrag : p))),
      );
      return;
    }
    const neu = [...bisher, eintrag].slice(-MAX_PROTOKOLLE);
    protokollStore.set(JSON.stringify(neu));
    setProtokollIndex(neu.length - 1);
  };

  const gespraechZuruecksetzen = () => {
    speech.zuruecksetzen();
    setCheckliste(CHECKLIST.map(() => false));
    setErkannteEinwaende([]);
    setProtokollIndex(null);
    setStepIndex(0);
  };

  const offeneKontakte = liste.kontakte.filter((k) => !k.ergebnis).length;
  const kopfKnopf = (ziel: Panel, text: string) => (
    <button
      type="button"
      className="link-btn"
      aria-pressed={panel === ziel}
      onClick={() => setPanel((p) => (p === ziel ? "keins" : ziel))}
    >
      {text}
    </button>
  );

  return (
    <main className="app">
      <header className="header">
        <h1>Anruf-Assistent</h1>
        <Progress index={Math.min(stepIndex, schritte.length - 1)} total={schritte.length} />
        <nav className="kopf-aktionen">
          {kopfKnopf(
            "liste",
            `Liste${liste.kontakte.length > 0 ? ` (${offeneKontakte}/${liste.kontakte.length})` : ""}`,
          )}
          {kopfKnopf("notizen", `Notizen${notizen.trim() ? (briefing.trim() ? " ✓" : " ●") : ""}`)}
          {kopfKnopf(
            "nachbereitung",
            `Nachbereitung${speech.verlauf.length > 0 ? ` (${speech.verlauf.length})` : ""}`,
          )}
          <span className="kopf-trenner" aria-hidden="true" />
          {kopfKnopf("einrichten", "Einrichten")}
        </nav>
      </header>

      {panel === "liste" && (
        <ListPanel
          liste={liste}
          onAktiv={(id) => {
            setzeAktiv(id);
            gespraechZuruecksetzen();
          }}
          onAendern={aendereKontakt}
          onErgaenzen={ergaenzen}
          onEntfernen={entfernen}
          onLeeren={alleLeeren}
          basisSkript={basisSkript}
          settings={settings}
          signale={signale}
          onSignaleChange={signaleSetzen}
        />
      )}

      {panel === "notizen" && (
        <NotesPanel
          notizen={notizen}
          onNotizenChange={(w) => aendereAktiven({ notizen: w })}
          briefing={briefing}
          onBriefingChange={(w) => aendereAktiven({ briefing: w })}
          kontakt={kontaktName}
          onKontaktChange={(w) => aendereAktiven({ name: w })}
          anrede={anrede}
          onAnredeChange={(w) => aendereAktiven({ anrede: w })}
          kontext={kontext}
          basisSkript={basisSkript}
          basisRoh={skriptText}
          onBasisChange={(w) => skriptStore.set(w)}
          onAngepasstChange={(w) => aendereAktiven({ skriptAngepasst: w })}
          onZumSkript={() => {
            setPanel("einrichten");
            setEinrichten("skript");
          }}
          settings={settings}
          signale={signale}
          onSignaleChange={signaleSetzen}
        />
      )}

      {panel === "nachbereitung" && (
        <WrapUpPanel
          verlauf={speech.verlauf}
          notizen={notizen}
          settings={settings}
          ergebnis={aktiv?.ergebnis ?? ""}
          onErgebnis={ergebnisSetzen}
          checkliste={checkliste}
          onCheckliste={(i) =>
            setCheckliste((v) => v.map((wert, idx) => (idx === i ? !wert : wert)))
          }
          onNeuesGespraech={() => {
            aendereAktiven({ skriptAngepasst: "" });
            gespraechZuruecksetzen();
          }}
          hatNaechsten={offeneKontakte > (aktiv?.ergebnis ? 0 : 1)}
          onNaechsterKontakt={() => {
            if (zumNaechsten()) {
              gespraechZuruecksetzen();
              setPanel("keins");
            }
          }}
        />
      )}

      {panel === "einrichten" && (
        <>
          <div className="panel__kopf panel__kopf--frei">
            {(
              [
                ["skript", "Skript"],
                ["kontext", "Kontext"],
                ["statistik", "Statistik"],
                ["einstellungen", "Einstellungen"],
              ] as [Einrichten, string][]
            ).map(([wert, text]) => (
              <button
                key={wert}
                type="button"
                className="link-btn"
                aria-pressed={einrichten === wert}
                onClick={() => setEinrichten(wert)}
              >
                {text}
              </button>
            ))}
          </div>

          {einrichten === "skript" && (
            <ScriptPanel
              skript={skriptText}
              onSkriptChange={(w) => skriptStore.set(w)}
              angepasst={angepasst}
              onAngepasstChange={(w) => aendereAktiven({ skriptAngepasst: w })}
              briefing={briefing}
              notizen={notizen}
              settings={settings}
            />
          )}
          {einrichten === "kontext" && (
            <ContextPanel
              kontext={kontext}
              onKontextChange={(w) => kontextStore.set(w)}
              settings={settings}
            />
          )}
          {einrichten === "statistik" && (
            <StatsPanel protokolle={protokolle} onLeeren={() => protokollStore.set("[]")} />
          )}
          {einrichten === "einstellungen" && (
            <SettingsPanel
              settings={settings}
              onChange={(neu) => {
                settingsStore.set(JSON.stringify(neu));
                pruefeVerbindung(neu);
              }}
            />
          )}
        </>
      )}

      <HealthBanner health={health} />

      {aktiv && (aktiv.firma || aktiv.name) && (
        <p className="aktiver-kontakt">
          {aktiv.firma || "—"}
          {aktiv.name ? ` · ${aktiv.name}` : ""}
          {liste.kontakte.length > 1 ? ` · ${offeneKontakte} offen` : ""}
        </p>
      )}

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
            onEinwandErkannt={einwandErkannt}
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
