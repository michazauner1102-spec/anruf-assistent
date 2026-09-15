# Anruf-Assistent

Ein Bildschirm, den man während eines Verkaufstelefonats offen hat. Links das Skript,
rechts die Einwandbehandlung. Das Tool hört über das Mikrofon mit, erkennt Einwände und
zeigt sofort die passende Antwort. Für alles, was nicht hinterlegt ist, formuliert ein
Sprachmodell eine Antwort — wahlweise **lokal über Ollama** oder über eine **Cloud-API mit
eigenem Key**.

Zwei Eingabebereiche liefern dem Modell Kontext:

- **Notizen** — Recherche zum *Gegenüber*: einfügen oder dessen Website automatisch
  auslesen lassen.
- **Kontext** — Angaben zum *eigenen* Angebot, plus optional ein **eigenes Skript**, das
  den mitgelieferten Ablauf ersetzt.

Das Modell kennt außerdem den **bisherigen Gesprächsverlauf**. Es wiederholt also nicht,
was schon gefragt wurde, sondern setzt dort an, wo das Gespräch gerade steht.

> Die mitgelieferten Inhalte stammen aus der Kaltakquise für KI-Automatisierung bei
> Immobilienmaklern. Für einen anderen Anwendungsfall tauscht man drei Dateien aus —
> siehe [Auf den eigenen Fall anpassen](#auf-den-eigenen-fall-anpassen).

## Schnellstart

```bash
git clone <repo-url>
cd call-assistant
npm install
cp .env.local.example .env.local
npm run dev
```

Dann `http://localhost:3000` **in Chrome** öffnen.

Beim ersten Start entsteht `src/data/profile.ts` aus der Vorlage. Diese Datei enthält
Name, Firma, Angebot, Preise und Terminlink — **hier zuerst die eigenen Angaben
eintragen.** Sie wird von git ignoriert, die eigenen Daten landen also nie im Repo.

Für das lokale Modell zusätzlich [Ollama](https://ollama.com) installieren und ein Modell
laden:

```bash
ollama pull gemma4:latest
```

## Damit das Mithören funktioniert

Der Browser hört über das **Mikrofon des Rechners** — nicht in die Telefonleitung. Die
Stimme des Gegenübers muss also im Raum hörbar sein:

- **Handy auf Lautsprecher** neben den Rechner legen. So ist es gedacht.
- Softphone mit Lautsprecher-Ausgabe funktioniert ebenfalls.
- **Mit Kopfhörern oder Handy am Ohr funktioniert es nicht** — das Mikrofon hört das
  Gegenüber dann schlicht nicht.

Weitere Voraussetzungen: **Chrome** (Safari und Firefox können die Spracherkennung nicht
zuverlässig), Aufruf über `localhost` (über eine WLAN-IP verweigert der Browser den
Mikrofon-Zugriff, weil das kein sicherer Kontext ist), und beim ersten Klick die
Mikrofon-Erlaubnis.

## Der Gesprächsverlauf

Jede erkannte Äußerung des Gegenübers und jeder genutzte Vorschlag wandern in eine
Historie, die als echte Chat-Nachrichten ans Modell geht — nicht als Textblock im Prompt.
Das ändert das Verhalten spürbar:

| Situation | ohne Verlauf | mit Verlauf |
|---|---|---|
| „Wir haben schon so ein System." | Rückfrage nach der Qualifizierung | dieselbe Rückfrage |
| Gegenüber antwortet: „Das schickt eine Mail, dann melde ich mich selbst." | wieder eine allgemeine Rückfrage | „Genau da liegt der Zeitfresser. Wie viel Zeit verbringen Sie täglich damit, die Rückmeldungen zu sichten?" |

Beim ersten Druck heißt der Knopf **Modell fragen**, danach **Anderer Zug**. Jeder weitere
Druck bekommt die bereits vorgeschlagenen Formulierungen mitgeschickt — inklusive der
hinterlegten Standardantwort — und muss einen anderen Weg gehen: eine andere Ebene
ansprechen, konkreter nachfassen oder zum Termin führen.

## Eigenes Skript

Im Bereich **Kontext → Eigenes Skript** lässt sich der Ablauf ersetzen, per Datei oder
Einfügen. Das Format ist bewusst simpel:

```
# Begrüßung
Guten Tag [Name], kurz gestört?
> Lächeln nicht vergessen.

# Aufhänger
Ich habe gesehen, dass [Thema] bei Ihnen läuft.
```

`#` beginnt einen Schritt, `>` ist ein Hinweis, alles andere ist ein gesprochener Satz.
Text in eckigen Klammern wird als Einsetzstelle hervorgehoben. Die Schrittzahl und die
Fortschrittsanzeige passen sich automatisch an; ein leeres Feld stellt auf das
mitgelieferte Skript zurück.

## Modell einstellen

Zwei Wege, beide gleichwertig:

| | lokal | Cloud |
|---|---|---|
| Einstellung | `MODEL_PROVIDER=ollama` | `MODEL_PROVIDER=openai` |
| Adresse | `OLLAMA_HOST` | `CLOUD_BASE_URL` |
| Modell | `OLLAMA_MODEL` | `CLOUD_MODEL` |
| Key | — | `CLOUD_API_KEY` |

Die Cloud-Variante spricht die OpenAI-kompatible API und funktioniert damit mit OpenAI,
Groq, OpenRouter, Together, Ollama Cloud und anderen — es genügt, Basis-URL und Modellname
anzupassen.

Alles lässt sich auch **zur Laufzeit** im Einstellungsbereich der App überschreiben. Diese
Eingaben liegen im `localStorage` des Browsers und werden nur an die eigene API-Route und
von dort an den gewählten Anbieter geschickt. Wer keinen Key im Browser halten möchte,
trägt ihn in `.env.local` ein und lässt die Felder leer.

## Datenschutz

Das Tool ist für den lokalen Betrieb gebaut, aber drei Dinge verlassen je nach Einstellung
den Rechner — bewusst und sichtbar:

1. **Spracherkennung:** Chrome verarbeitet sie nicht auf dem Gerät, sondern schickt das
   Audio an Google. Wer das nicht will, startet das Mithören nicht; Eingabefeld und
   Modell-Abfrage funktionieren unabhängig davon.
2. **Cloud-Modell:** Einwand-Text *und* Firmen-Notizen gehen an den Anbieter. Die App zeigt
   dann oben einen Hinweis. Mit einem lokalen Ollama-Modell bleibt beides hier.
3. **Website auslesen:** Die angegebene Adresse wird vom Server abgerufen. Interne Adressen
   (`localhost`, private IP-Bereiche) sind gesperrt.

Notizen, eigener Kontext und eigenes Skript liegen ausschließlich im `localStorage` des
Browsers — es gibt keine Datenbank und kein Backend. Mit einem Cloud-Modell gehen Notizen,
Kontext und Gesprächsverlauf an den Anbieter.

## Auf den eigenen Fall anpassen

Drei Dateien, in dieser Reihenfolge:

1. **`src/data/profile.ts`** — Name, Firma, Zielgruppe, Angebot, Preise, Terminlink.
   Wird beim ersten Start aus `profile.example.ts` erzeugt und von git ignoriert. Skript,
   Einwände und der System-Prompt des Modells ziehen ihre Angaben von hier — der Preis
   steht also an genau einer Stelle.
2. **`src/data/script.ts`** — die Gesprächsschritte. Text in eckigen Klammern (`[Name]`)
   wird im UI hervorgehoben, das sind die Einsetzstellen beim Vorlesen.
3. **`src/data/objections.ts`** — die Einwände. Pro Eintrag: Suchtext mit Synonymen, die
   sichtbare Frage, der vorlesbare Satz, dazu optional die echte Ursache und die
   Antwort-Formel.

Danach `npm run build` und den Testlauf unten.

## Wie die Einwand-Erkennung entscheidet

In `src/lib/search.ts` stecken zwei getrennte Verfahren:

- `scoreObjections()` — für getippte Suche, einfache Wortzählung.
- `matchFromSpeech()` — für gesprochene Sprache, deutlich strenger:
  - **exakter Wortvergleich**, kein Teilstring (sonst träfe „auto" in „automatisierung"),
  - Füllwörter und Negationen fliegen raus. „nicht" stand anfangs im Suchtext von „Kein
    Interesse" — damit löste *jeder verneinte Satz* diesen Einwand aus,
  - Wörter, die nur in **einer** Kategorie vorkommen, zählen doppelt („crm", „kosten"),
  - unterhalb von 2 Punkten wird bewusst **nichts** angezeigt. Ein falscher Vorschlag
    mitten im Gespräch ist schlimmer als gar keiner,
  - gematcht wird der **gerade gesprochene Satz**, nicht das ganze Gespräch.

### Einen Einwand ergänzen

Eintrag in `objections.ts`, gesprochenen Testsatz in `src/app/api/matcher-test/route.ts`,
dann den Test laufen lassen:

```bash
curl localhost:3000/api/matcher-test
```

Er prüft aktuell 75 Sätze: je einen pro Einwand plus 24 Alltagssätze, die **nichts**
auslösen dürfen. Er meldet außerdem, wenn ein Einwand gar keinen Testsatz hat.

Drei Regeln für den `search`-Text:

1. **Keine Alltagswörter.** „nicht", „läuft", „gerade" lösen sonst bei jedem zweiten Satz
   aus. Und Vorsicht mit Fachvokabular der Zielgruppe: bei Immobilienmaklern ist
   „verkaufen" ein völlig normales Wort.
2. **Ein Wort möglichst nur in einer Kategorie** — daraus zieht die Erkennung ihre
   Trennschärfe.
3. **Bei Gleichstand gewinnt der weiter oben stehende Eintrag**, spezifischere Einwände
   also vor allgemeinere sortieren.

## Technische Notiz: `think: false`

Die Ollama-Anfrage enthält `think: false`. Grund: Thinking-fähige Modelle wie `gemma4`
denken per Default, und zusammen mit einem knappen Token-Budget verbraucht das interne
Denken das gesamte Budget — die Antwort kommt dann **leer** zurück (`done_reason: "length"`).
Modelle ohne Thinking ignorieren das Feld folgenlos. Der Stream-Parser verwirft zusätzlich
`message.thinking`, damit kein Denkprotokoll im Antworttext landet.

## Aufbau

```
src/
  app/page.tsx                    der eine Screen
  app/api/objection-answer/       POST, streamt die Modellantwort (NDJSON)
  app/api/research/               POST, liest eine Website aus und fasst sie zusammen
  app/api/health/                 POST, prüft Anbieter und Modell
  app/api/matcher-test/           GET, Regressionstest der Erkennung
  components/Stepper.tsx          Gesprächsschritt
  components/LiveListener.tsx     Mithören, Treffer, Modell-Abfrage
  components/NotesPanel.tsx       Recherche zum Gegenüber, Website-Auslese
  components/ContextPanel.tsx     eigener Kontext und eigenes Skript
  components/SettingsPanel.tsx    Anbieter, Modell, API-Key
  lib/model.ts                    Ollama und OpenAI-kompatibel hinter einer Schnittstelle
  lib/prompt.ts                   System-Prompt, Notizen, Verlauf als Chat-Historie
  lib/scriptParser.ts             Textformat für eigene Skripte
  lib/conversation.ts             Gesprächsverlauf
  lib/search.ts                   beide Trefferverfahren
  data/profile.ts                 hier zuerst anpassen (lokal, nicht im Repo)
  data/profile.example.ts         Vorlage dafür
  scripts/ensure-profile.mjs      legt profile.ts beim ersten Start an
```

## Kein Cloud-Deployment

Mit lokalem Ollama ergibt ein gehosteter Server keinen Sinn — er käme nicht an das Modell
auf dem eigenen Rechner heran. Mit einer Cloud-API ließe sich die App zwar deployen, dann
gehört aber ein Zugriffsschutz davor: sie hat keine Authentifizierung.

## Lizenz

MIT — siehe [LICENSE](LICENSE).
