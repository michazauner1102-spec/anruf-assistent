# Anruf-Assistent

Ein Bildschirm für Verkaufstelefonate. Links das Skript, rechts die Einwandbehandlung.
Das Tool hört über das Mikrofon mit und zeigt die passende Antwort, sobald ein Einwand
fällt. Läuft lokal mit Ollama oder über eine Cloud-API.

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
- **Kontext** zum eigenen Angebot: eigene Website auslesen lassen, Datei laden oder
  einfügen — die Auswertung achtet dabei auf Leistungen, Positionierung und Preise statt
  auf Gesprächsaufhänger
- **Eigenes Skript** in einem einfachen Textformat, ersetzt den mitgelieferten Ablauf

**Nach dem Gespräch**

- Mitschnitt des Gesprächs, zum Kopieren
- Zusammenfassung fürs CRM: Ergebnis, Lage, Einwände, nächster Schritt, Aufhänger
- Checkliste für die Nachbereitung

**Technik**

- Lokales Modell (Ollama) oder Cloud-API mit eigenem Key, im UI umschaltbar
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
ollama pull gemma4:latest
```

Beim ersten Start entsteht `src/data/profile.ts`. Dort Name, Firma, Angebot, Preise und
Terminlink eintragen. Die Datei wird von git ignoriert.

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

Bereich **Kontext → Eigenes Skript**, per Datei oder Einfügen:

```
# Begrüßung
Guten Tag [Name], kurz gestört?
> Lächeln nicht vergessen.

# Aufhänger
Ich habe gesehen, dass [Thema] bei Ihnen läuft.
```

`#` beginnt einen Schritt, `>` ist ein Hinweis, alles andere ist ein gesprochener Satz.
Eckige Klammern werden hervorgehoben. Leeres Feld = mitgeliefertes Skript.

## Auf den eigenen Fall anpassen

Drei Dateien, in dieser Reihenfolge:

1. `src/data/profile.ts` — Name, Firma, Angebot, Preise, Terminlink. Skript, Einwände und
   der System-Prompt ziehen alles von hier. Der Preis steht an genau einer Stelle.
2. `src/data/script.ts` — die Gesprächsschritte.
3. `src/data/objections.ts` — die Einwände.

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

Eintrag in `objections.ts`, Testsatz in `src/app/api/matcher-test/route.ts`, dann:

```bash
curl localhost:3000/api/matcher-test
```

75 Sätze: einer pro Einwand plus 24 Alltagssätze, die nichts auslösen dürfen. Der Test
meldet auch Einwände ohne Testsatz.

Drei Regeln für den Suchtext:

1. Keine Alltagswörter. Bei Immobilienmaklern ist „verkaufen" ein normales Wort.
2. Ein Wort möglichst nur in einer Kategorie.
3. Bei Gleichstand gewinnt der obere Eintrag — spezifische Einwände nach oben.

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
  app/api/health/               Anbieter und Modell prüfen
  app/api/matcher-test/         Regressionstest der Erkennung
  components/LiveListener.tsx   Mithören, Treffer, Modell-Abfrage
  components/WrapUpPanel.tsx    Mitschnitt, Zusammenfassung, Checkliste
  components/NotesPanel.tsx     Recherche zum Gegenüber
  components/ContextPanel.tsx   eigener Kontext, eigenes Skript
  lib/model.ts                  Ollama und OpenAI-kompatibel hinter einer Schnittstelle
  lib/prompt.ts                 System-Prompts, Verlauf als Chat-Historie
  lib/search.ts                 Einwand-Erkennung
  lib/urlGuard.ts               SSRF-Schutz
  data/profile.ts               hier zuerst anpassen (lokal, nicht im Repo)
```

## Kein Cloud-Deployment

Mit lokalem Ollama ergibt ein gehosteter Server keinen Sinn — er käme nicht an das Modell
auf dem eigenen Rechner. Mit einer Cloud-API ließe sich die App deployen, dann gehört aber
ein Zugriffsschutz davor: sie hat keine Anmeldung.

## Lizenz

MIT — siehe [LICENSE](LICENSE).
