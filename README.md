# Anruf-Assistent

Ein Bildschirm für Verkaufstelefonate. Links das Skript, rechts die Einwandbehandlung.
Das Tool hört über das Mikrofon mit und zeigt die passende Antwort, sobald ein Einwand
fällt. Läuft lokal mit Ollama oder über eine Cloud-API.

Branchenunabhängig: Skript, Einwände und Angaben zur eigenen Firma sind Inhalte, keine
Programmlogik. Mitgeliefert wird eine neutrale B2B-Vorlage, die du durch deine eigenen
Texte ersetzt.

## Features

**Im Gespräch**

- Skript-Durchlauf mit schmaler Fortschrittsanzeige
- Mithören über das Mikrofon, Einwand-Erkennung in Echtzeit
- 51 hinterlegte Einwände in 10 Kategorien, je mit Antwort und der Ursache dahinter
- Freie Einwände beantwortet ein Sprachmodell im selben Stil
- Das Modell kennt den Gesprächsverlauf: jeder weitere Druck liefert einen anderen Zug,
  keine Wiederholung
- Platzhalter wie `[Name]` sind hervorgehoben

**Vorbereitung**

- **Notizen** zum Gegenüber: dessen Website auslesen lassen oder einfügen
- **Notizen auswerten**: ein Knopfdruck macht aus roher Recherche ein Briefing —
  Ansprechpartner, Kurzprofil, Ansatzpunkt, Gesprächsaufhänger mit dem jeweiligen
  Detail, erwartbare Einwände, Vorsicht. Das Briefing geht als Kontext mit ins Gespräch
- Findet die Auswertung einen **Namen**, steht er direkt im Skript: `[Vorname]`,
  `[Nachname]` und `[Name]` werden gefüllt und bleiben markiert. Titel wie „Dr." fallen
  für die Anrede weg, Partikel wie „von" bleiben am Nachnamen. Überschreibbar
- **Kontext** zum eigenen Angebot: eigene Website auslesen lassen, Datei laden oder
  einfügen — die Auswertung achtet dabei auf Leistungen, Positionierung und Preise statt
  auf Gesprächsaufhänger
- **Skript** als eigener Bereich: eigenen Ablauf laden oder eintippen, ersetzt den
  mitgelieferten

**Nach dem Gespräch**

- Mitschnitt des Gesprächs, zum Kopieren
- Zusammenfassung fürs CRM: Ergebnis, Lage, Einwände, nächster Schritt, Aufhänger
- Checkliste für die Nachbereitung

**Technik**

- Lokales Modell (Ollama) oder Cloud-API mit eigenem Key, im UI umschaltbar
- Terminlink jedes Anbieters, unten immer griffbereit und im UI änderbar
- Keine Datenbank, kein Backend. Alles liegt im Browser
- Regressionstest für die Einwand-Erkennung unter `/api/matcher-test`

## Schnellstart

```bash
git clone <repo-url>
cd call-assistant
npm install
cp .env.local.example .env.local
npm run dev
```

`http://localhost:3000` **in Chrome** öffnen.

Für das lokale Modell zusätzlich [Ollama](https://ollama.com) installieren:

```bash
ollama pull llama3.1:8b
```

Beim ersten Start entstehen aus den Vorlagen drei Dateien:

| Datei | Inhalt |
|---|---|
| `src/data/profile.ts` | Name, Firma, Zielgruppe, Angebot, Preise, Terminlink |
| `src/data/script.ts` | der Gesprächsablauf |
| `src/data/objections.ts` | die Einwände samt Testsätzen |

Alle drei werden von git ignoriert — deine Texte landen nie im Repo. Fang mit `profile.ts`
an: Skript, Einwände und der System-Prompt ziehen Name, Firma und Preise von dort, der
Preis steht also an genau einer Stelle.

## Mithören: was es braucht

Der Browser hört über das **Mikrofon des Rechners**, nicht in die Leitung. Die Stimme des
Gegenübers muss also im Raum zu hören sein:

- Handy auf Lautsprecher neben den Rechner legen
- Oder ein Softphone mit Lautsprecher-Ausgabe
- **Mit Kopfhörer oder Handy am Ohr funktioniert es nicht**

Dazu: **Chrome** (andere Browser können es nicht zuverlässig), Aufruf über `localhost`
(über eine WLAN-IP sperrt der Browser das Mikrofon), und einmal die Mikrofon-Erlaubnis.

Das Mikrofon nimmt beide Seiten auf. Der Mitschnitt ist deshalb **nicht nach Sprechern
getrennt** — die Zusammenfassung weiß das und ordnet nur zu, was eindeutig ist.

## Modell einstellen

| | lokal | Cloud |
|---|---|---|
| `MODEL_PROVIDER` | `ollama` | `openai` |
| Adresse | `OLLAMA_HOST` | `CLOUD_BASE_URL` |
| Modell | `OLLAMA_MODEL` | `CLOUD_MODEL` |
| Key | — | `CLOUD_API_KEY` |

Die Cloud-Variante spricht die OpenAI-kompatible API. Damit laufen OpenAI, Groq,
OpenRouter, Together, Ollama Cloud und andere — es genügt, Adresse und Modellname
anzupassen.

Alles lässt sich auch im Einstellungsbereich der App überschreiben. Diese Eingaben liegen
im Browser. Wer keinen Key im Browser halten will, trägt ihn in `.env.local` ein und lässt
das Feld leer.

## Eigenes Skript

Bereich **Skript** oben, per Datei oder Einfügen:

```
# Begrüßung
Guten Tag [Name], kurz gestört?
> Lächeln nicht vergessen.

# Aufhänger
Ich habe gesehen, dass [Thema] bei Ihnen läuft.
```

`#` beginnt einen Schritt, `>` ist ein Hinweis, alles andere ist ein gesprochener Satz.
Eckige Klammern werden hervorgehoben; `[Name]`, `[Vorname]` und `[Nachname]` füllt das
Tool mit dem Gesprächspartner aus den Notizen. Leeres Feld = mitgeliefertes Skript.

## Auf die eigene Branche anpassen

Die mitgelieferte Vorlage ist bewusst neutral gehalten: allgemeine B2B-Einwände, ein
Gesprächsablauf ohne Branchenvokabular. Zum Anpassen reichen die drei Inhaltsdateien
oben — Code muss man dafür nicht anfassen.

Worauf es beim Ersetzen ankommt:

- **`profile.ts` zuerst.** Zielgruppe, Angebot und Preise steuern, wie das Modell
  formuliert.
- **Terminlink:** beliebiger Anbieter — Calendly, cal.com, Google Kalender, Microsoft
  Bookings oder eine eigene Seite. Reicht als Adresse ohne `https://`. Lässt sich auch
  im Einstellungsbereich überschreiben, ohne die Datei anzufassen.
- **Einwände sind branchenspezifisch.** Was in einem Fach ein klarer Einwand ist, ist im
  anderen Alltagssprache. Deshalb bringt jeder Einwand seinen eigenen Testsatz mit, und
  `RUHE_SAETZE` sammelt Sätze aus der eigenen Branche, die nichts auslösen dürfen.
- **Nach jeder Änderung den Test laufen lassen** (siehe unten). Er prüft automatisch
  deine Inhalte, nicht die der Vorlage.

## Einwand-Erkennung

Zwei Verfahren in `src/lib/search.ts`:

- `scoreObjections()` für getippte Suche — einfache Wortzählung.
- `matchFromSpeech()` für gesprochene Sprache — deutlich strenger:
  - exakter Wortvergleich, kein Teilstring (sonst träfe „auto" in „automatisierung")
  - Füllwörter und Negationen fliegen raus
  - Wörter, die nur in einer Kategorie vorkommen, zählen doppelt
  - unter 2 Punkten wird **nichts** angezeigt
  - gematcht wird der gerade gesprochene Satz, nicht das ganze Gespräch

### Einen Einwand ergänzen

Eintrag in `objections.ts` anlegen, dabei `testsatz` mit einem real gesprochenen Satz
füllen. Dann:

```bash
curl localhost:3000/api/matcher-test
```

Der Test zieht seine Fälle aus den Daten: je ein Testsatz pro Einwand plus die
`RUHE_SAETZE`. Er meldet auch Einwände, die noch keinen Testsatz haben.

Drei Regeln für den Suchtext:

1. **Keine Alltagswörter deiner Branche.** Bei einem Makler ist „verkaufen" normales
   Fachvokabular, bei einer Agentur „Kampagne", in der Logistik „Lieferung".
2. Ein Wort möglichst nur in einer Kategorie.
3. Bei Gleichstand gewinnt der obere Eintrag — spezifische Einwände nach oben.

**Grenze:** Das Mikrofon trennt die Sprecher nicht. Sätze, die *du* sagst („ich schicke
Ihnen die Unterlagen"), enthalten dieselben Wörter wie der zugehörige Einwand und können
eine Karte auslösen. Mit Wortlisten ist das nicht trennbar.

## Sicherheit

**Beim Auslesen einer Website** prüft der Server jede Station: Schema, die aufgelöste
IP und jede Weiterleitung einzeln. Interne Ziele sind gesperrt (Loopback, `10.x`,
`192.168.x`, `172.16–31.x`, Link-local inklusive `169.254.169.254`, CGNAT, IPv6-ULA).
Ohne das könnte eine fremde Seite auf einen Dienst im eigenen Netz umleiten. Dazu: nur
Text-Inhaltstypen, höchstens 2 MB, drei Weiterleitungen, 15 Sekunden.

Dieselbe Prüfung gilt für die Modell-Adresse aus den Einstellungen — mit Ausnahme von
Loopback, weil dort das lokale Ollama liegt.

**Fremder Seitentext** geht dem Modell ausdrücklich als Datenquelle zu, nicht als
Anweisung. Eingebettete Befehle werden als Auffälligkeit gemeldet statt befolgt.

**Was den Rechner verlässt:**

- Spracherkennung: Chrome schickt das Audio an Google. Wer das nicht will, startet das
  Mithören nicht — der Rest funktioniert weiter.
- Cloud-Modell: Einwand, Notizen, Kontext und Gesprächsverlauf gehen an den Anbieter.
  Mit lokalem Ollama bleibt alles hier.

**Grenzen:**

- Keine Anmeldung. `npm run dev:lan` öffnet die App fürs ganze WLAN — jeder im Netz kann
  dann Modell-Anfragen auslösen, bei einer Cloud-API auf deine Rechnung.
- Ein im UI eingetragener API-Key liegt im `localStorage`.
- DNS-Rebinding: zwischen Prüfung und Abruf löst das System den Namen erneut auf.

## Aufbau

```
src/
  app/page.tsx                  der eine Screen
  app/api/objection-answer/     Antwort auf einen Einwand (streamt)
  app/api/summary/              Zusammenfassung fürs CRM (streamt)
  app/api/research/             Website auslesen und zusammenfassen
  app/api/briefing/             Notizen zu einem Briefing verdichten
  app/api/health/               Anbieter und Modell prüfen
  app/api/matcher-test/         Regressionstest der Erkennung
  components/LiveListener.tsx   Mithören, Treffer, Modell-Abfrage
  components/WrapUpPanel.tsx    Mitschnitt, Zusammenfassung, Checkliste
  components/NotesPanel.tsx     Recherche zum Gegenüber
  components/ScriptPanel.tsx    eigenes Skript
  components/ContextPanel.tsx   Angaben zum eigenen Angebot
  lib/model.ts                  Ollama und OpenAI-kompatibel hinter einer Schnittstelle
  lib/prompt.ts                 System-Prompts, Verlauf als Chat-Historie
  lib/streamRoute.ts            gemeinsame Streaming-Mechanik der Modell-Routen
  lib/search.ts                 Einwand-Erkennung
  lib/urlGuard.ts               SSRF-Schutz
  data/profile.ts               eigene Angaben (lokal, nicht im Repo)
  data/script.ts                eigenes Skript (lokal)
  data/objections.ts            eigene Einwände (lokal)
  data/*.example.ts             neutrale Vorlagen, aus denen die drei entstehen
```

## Kein Cloud-Deployment

Mit lokalem Ollama ergibt ein gehosteter Server keinen Sinn — er käme nicht an das Modell
auf dem eigenen Rechner. Mit einer Cloud-API ließe sich die App deployen, dann gehört aber
ein Zugriffsschutz davor: sie hat keine Anmeldung.

## Lizenz

MIT — siehe [LICENSE](LICENSE).
