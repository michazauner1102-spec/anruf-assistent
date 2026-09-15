import { PROFILE } from "./profile";

export type CategoryId =
  | "zeit"
  | "skepsis"
  | "loesung"
  | "bedarf"
  | "preis"
  | "vertrauen"
  | "datenschutz"
  | "zustaendig"
  | "ablauf"
  | "mail";

export interface Objection {
  id: string;
  category: CategoryId;
  /**
   * Suchtext inkl. Synonyme — einzige Grundlage fuer die Treffersuche.
   * WICHTIG: Ein Wort sollte moeglichst nur in EINER Kategorie vorkommen, denn
   * genau daraus zieht matchFromSpeech() seine Trennschaerfe. Und: keine
   * Alltagswoerter aufnehmen, die in jedem zweiten Satz fallen.
   */
  search: string;
  question: string;
  /** Der vorlesbare Satz. */
  answer: string;
  /** Was hinter dem Einwand wirklich steckt — hilft zu entscheiden, ob bohren oder loslassen. */
  ursache?: string;
  /** Das Muster hinter der Antwort. Nur zur Vorbereitung, nicht im Gespraech eingeblendet. */
  formel?: string;
  /**
   * Ein real gesprochener Satz, der genau diesen Einwand ausloesen muss.
   * /api/matcher-test prueft damit jeden Eintrag — auch in einem Fork.
   */
  testsatz?: string;
}

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  zeit: "Zeit",
  skepsis: "Skepsis",
  loesung: "Bestehende Lösung",
  bedarf: "Kein Bedarf",
  preis: "Preis",
  vertrauen: "Vertrauen",
  datenschutz: "Datenschutz & Technik",
  zustaendig: "Zuständigkeit",
  ablauf: "Ablauf",
  mail: "Mail",
};

export const CATEGORY_ORDER: CategoryId[] = [
  "zeit",
  "skepsis",
  "loesung",
  "bedarf",
  "preis",
  "vertrauen",
  "datenschutz",
  "zustaendig",
  "ablauf",
  "mail",
];

export interface CategoryStrategy {
  schema: string;
  universalantwort: string;
}

/**
 * Strategie fuer eine ganze Gruppe. Bei "Wir haben schon etwas" gilt: nicht
 * widersprechen, sondern offenlegen, was da wirklich laeuft.
 */
export const CATEGORY_STRATEGY: Partial<Record<CategoryId, CategoryStrategy>> = {
  loesung: {
    schema:
      "Nicht widersprechen. Erst verstehen, was sie wirklich haben — meist ein CRM mit manuellem Follow-up, ein Portal-Autoresponder oder ein Chatbot ohne Qualifizierungslogik.",
    universalantwort:
      "Darf ich kurz fragen: Wie viele Ihrer Anfragen der letzten vier Wochen haben sich von selbst zu einem Termin qualifiziert, ohne dass Sie manuell nachfassen mussten?",
  },
};

export const OBJECTIONS: Objection[] = [
  // ---------- Zeit ----------
  {
    id: "zeit-keine-zeit",
    category: "zeit",
    search: "keine zeit zeitlich beschäftigt stress schlecht ungünstig busy",
    question: "Ich hab gerade keine Zeit.",
    answer:
      "Verstehe ich. Wann ist ein besserer Moment, Dienstag früh oder Mittwoch Nachmittag?",
    ursache: "Falscher Moment — nicht unbedingt fehlendes Interesse.",
    formel: "Sofort akzeptieren, dann einen konkreten Rückruftermin sichern.",
     testsatz: "ja also ich hab gerade wirklich keine zeit dafür",
  },
  {
    id: "zeit-spaeter-melden",
    category: "zeit",
    search: "später nochmal melden quartal jahresende frühjahr herbst wiedervorlage",
    question: "Melden Sie sich in ein paar Monaten wieder.",
    answer: "Mach ich gern — welcher Zeitraum passt Ihnen genau?",
     testsatz: "melden sie sich doch in ein paar monaten nochmal",
  },
  {
    id: "zeit-unterwegs",
    category: "zeit",
    search: "termin unterwegs kundentermin auto fahre draußen auswärts",
    question: "Ich bin gerade unterwegs / in einem Termin.",
    answer: "Kein Problem, dann halte ich Sie nicht auf. Passt heute Nachmittag oder morgen früh besser?",
     testsatz: "ich bin gerade unterwegs zu einem kundentermin",
  },
  {
    id: "zeit-worum-geht-es",
    category: "zeit",
    search: "worum anliegen fassen punkt kommen",
    question: "Worum geht es? Fassen Sie sich kurz.",
    answer:
      `Ganz knapp: ${PROFILE.ziel}, unverbindlich. Diese oder nächste Woche?`,
     testsatz: "worum geht es denn kommen sie bitte zum punkt",
  },

  // ---------- Skepsis ----------
  {
    id: "skepsis-kein-interesse",
    category: "skepsis",
    search: "interesse interessiert desinteresse unnötig danke",
    question: "Ich bin nicht interessiert.",
    answer:
      "Fair. Nur kurz: Haben Sie das Thema bereits gelöst, oder liegt es einfach gerade nicht im Fokus?",
    ursache: "Noch kein Pain aktiviert, Skepsis gegenüber Kaltakquise.",
    formel: "Kurz Neugier wecken, dann loslassen.",
     testsatz: "nein da hab ich kein interesse dran",
  },
  {
    id: "skepsis-laeuft-gut",
    category: "skepsis",
    search: "zufrieden wozu bestens prima gewohnt bewährt eingespielt",
    question: "Läuft doch gut so, wozu brauch ich das?",
    answer:
      "Gut zu hören. Der Termin ist kein 'Sie machen was falsch' — nur ein kurzer, kostenloser Check.",
     testsatz: "bei uns läuft das eigentlich bestens so",
  },
  {
    id: "skepsis-versteckter-verkauf",
    category: "skepsis",
    search: "verkaufsmasche verkaufsgespräch masche trick aufschwatzen andrehen abzocke",
    question: "Ist das nicht nur Verkauf mit anderem Namen?",
    answer: "Verständlich. Ich zeig nur, wo Zeit liegen bleibt — kein Vertrag im Termin.",
     testsatz: "das ist doch nur so eine verkaufsmasche",
  },
  {
    id: "skepsis-ki-nichts-fuer-uns",
    category: "skepsis",
    search: "künstliche intelligenz technik technisch neumodisch hype roboter digitalisierung",
    question: "KI ist nichts für uns.",
    answer:
      "Verstehe ich. Im Termin geht es nicht um KI an sich, sondern um Ihre Abläufe. 30 Minuten, kostenlos.",
     testsatz: "künstliche intelligenz ist nichts für unser haus",
  },
  {
    id: "skepsis-vertrauensgeschaeft",
    category: "skepsis",
    search: "vertrauensgeschäft beziehungsgeschäft funktioniert zwischenmenschlich emotional",
    question: "Unser Geschäft lebt von persönlichen Beziehungen.",
    answer:
      "Genau deshalb geht es nicht ums Ersetzen, sondern um mehr Zeit für die Gespräche, auf die es ankommt. Schauen wir 30 Minuten drauf?",
     testsatz: "unser geschäft ist ein vertrauensgeschäft das funktioniert so nicht",
  },
  {
    id: "skepsis-zu-viele-anrufe",
    category: "skepsis",
    search: "anrufe angerufen dauernd ständig täglich nervt werbeanrufe belästigt",
    question: "Wir bekommen ständig solche Anrufe.",
    answer:
      "Glaube ich sofort. Deshalb mache ich es kurz: 30 Minuten, kostenlos, danach entscheiden Sie.",
     testsatz: "wir kriegen jede woche solche anrufe das nervt",
  },
  {
    id: "skepsis-was-bringt-das",
    category: "skepsis",
    search: "bringt konkret mehrwert vorteil rausspringt ergebnis",
    question: "Was bringt mir das konkret?",
    answer:
      "Konkret: Sie sehen, an welcher Stelle Ihrer Abläufe Zeit liegen bleibt. Das ist der Inhalt der 30 Minuten.",
     testsatz: "und was bringt mir das konkret",
  },

  // ---------- Bestehende Lösung ----------
  {
    id: "loesung-crm",
    category: "loesung",
    search: "crm anbieter branchensoftware fachsoftware warenwirtschaft",
    question: "Unser CRM schickt automatische Mails.",
    answer:
      "Das kenne ich. Der Unterschied ist: eine automatische Mail informiert, unser System fragt aktiv zurück, bewertet die Antwort und entscheidet, ob der Lead einen Termin bekommt. Macht Ihr CRM das auch?",
    ursache: "Verwechselt Benachrichtigung mit Qualifizierung.",
    formel: "Den Unterschied erklären, ohne zu belehren.",
     testsatz: "unser crm schickt doch automatische mails raus",
  },
  {
    id: "loesung-schon-system",
    category: "loesung",
    search: "system software programm tool lösung eingerichtet installiert vorhanden automatisch",
    question: "Wir haben schon ein System, das automatisch antwortet.",
    answer:
      "Gut. Was passiert, wenn jemand antwortet: qualifiziert das System dann selbst, oder landen alle Antworten trotzdem bei Ihnen?",
    ursache: "Bestehende Teil-Lösung, deren Wert überschätzt wird.",
    formel: "Nachfragen, was das System konkret tut — dann die Lücke benennen.",
     testsatz: "wir haben schon ein system das automatisch antwortet",
  },
  {
    id: "loesung-persoenlich",
    category: "loesung",
    search: "persönlich automatisierung automatisieren handarbeit selber manuell",
    question: "Machen lieber alles persönlich, keine Automatisierung.",
    answer: "Geht nicht ums Ersetzen — nur um mehr Zeit fürs Persönliche.",
     testsatz: "wir machen das lieber persönlich ohne automatisierung",
  },
  {
    id: "loesung-agentur",
    category: "loesung",
    search: "agentur dienstleister extern werbeagentur beauftragt",
    question: "Das macht unsere Agentur.",
    answer:
      "Gut. Der Termin ersetzt die Agentur nicht, es zeigt nur, was davon automatisch laufen könnte. 30 Minuten, kostenlos.",
     testsatz: "das macht bei uns die agentur",
  },
  {
    id: "loesung-chatgpt",
    category: "loesung",
    search: "chatgpt gpt openai copilot gemini",
    question: "Wir nutzen schon KI.",
    answer:
      "Interessant. Wofür genau? Ich frage, weil KI im Marketing-Text und KI in der Leadqualifizierung zwei völlig verschiedene Dinge sind.",
    ursache: "Vage Aussage — meist ist ChatGPT oder ein Plugin gemeint.",
    formel: "Konkret machen lassen.",
     testsatz: "wir nutzen doch schon chatgpt",
  },
  {
    id: "loesung-eigenes-team",
    category: "loesung",
    search: "mitarbeiterin kollegin azubi praktikant assistenz sekretärin backoffice",
    question: "Dafür haben wir jemanden im Team.",
    answer:
      "Ideal, dann hat die Person nachher mehr Zeit für das, was zählt. Schauen wir es uns 30 Minuten an?",
     testsatz: "das macht meine mitarbeiterin im backoffice",
  },

  // ---------- Kein Bedarf ----------
  {
    id: "bedarf-genug-auftraege",
    category: "bedarf",
    search: "genug aufträge ausgelastet projekte kapazität überlastet",
    question: "Wir haben genug zu tun.",
    answer:
      "Schön zu hören. Dann geht es im Termin eher um Zeitersparnis als um mehr Anfragen. 30 Minuten?",
     testsatz: "wir haben genug aufträge und sind gut ausgelastet",
  },
  {
    id: "bedarf-keine-leads",
    category: "bedarf",
    search: "leads leadgenerierung leadkauf zukaufen akquise",
    question: "Wir brauchen keine Leads.",
    answer:
      "Es geht nicht ums Zukaufen, sondern um die Anfragen, die Sie ohnehin bekommen — und wie schnell die beantwortet werden.",
     testsatz: "wir brauchen keine leads das läuft über empfehlungen",
  },
  {
    id: "bedarf-bewertungen-egal",
    category: "bedarf",
    search: "bewertungen rezensionen sterne google-bewertungen bewertungsportal",
    question: "Bewertungen sind uns nicht wichtig.",
    answer:
      "Verstehe. Dann lassen wir den Teil weg und schauen auf die Abläufe drumherum.",
     testsatz: "bewertungen sind uns eigentlich nicht wichtig",
  },
  {
    id: "bedarf-zu-klein",
    category: "bedarf",
    search: "klein kleines einzelkämpfer überschaubar winzig alleine familienbetrieb",
    question: "Wir sind zu klein dafür.",
    answer:
      "Gerade dann lohnt der Blick — weniger Leute, mehr Handgriffe. Die 30 Minuten kosten Sie nichts.",
     testsatz: "wir sind ein kleines haus dafür zu klein",
  },

  // ---------- Preis ----------
  {
    id: "preis-was-kostet",
    category: "preis",
    search: "kostet kosten preis geld budget kostenpunkt",
    question: "Was kostet das?",
    answer: "Erstgespräch: kostenlos, 30 Minuten. Rest klären wir transparent im Termin.",
     testsatz: "und was kostet das dann",
  },
  {
    id: "preis-danach",
    category: "preis",
    search: "ungefähr danach hausnummer laufende größenordnung",
    question: "Und ungefähr, was kostet's danach?",
    answer: "Kommt drauf an, einzelne Säule oder Gesamtpaket — zeig ich Ihnen konkret im Termin.",
     testsatz: "in welcher größenordnung bewegt sich das danach",
  },
  {
    id: "preis-kein-budget",
    category: "preis",
    search: "investieren sparen finanzen ausgeben mittel knapp",
    question: "Wir haben kein Budget dafür.",
    answer:
      "Dafür brauchen Sie keins: kostenlos, keine Einrichtungskosten. Alles Weitere entscheiden Sie danach.",
     testsatz: "dafür haben wir momentan nichts zum investieren",
  },
  {
    id: "preis-wo-ist-haken",
    category: "preis",
    search: "haken kostenlos gratis umsonst gegenleistung",
    question: "Kostenlos? Wo ist der Haken?",
    answer:
      "Kein Haken: Ich bin im Aufbau und lerne an echten Abläufen. Sie bekommen den Blick von außen, ich die Erfahrung.",
     testsatz: "kostenlos wo ist denn da der haken",
  },

  // ---------- Vertrauen ----------
  {
    id: "vertrauen-nummer",
    category: "vertrauen",
    search: "nummer telefonnummer woher herkunft impressum adresse kontaktdaten",
    question: "Woher haben Sie meine Nummer?",
    answer: "[öffentliche Quelle nennen]. Datenschutz ist übrigens auch Teil des Termins.",
     testsatz: "woher haben sie überhaupt meine telefonnummer",
  },
  {
    id: "vertrauen-unbekannt",
    category: "vertrauen",
    search: "kenne unbekannt gehört unbekannter niegehört",
    question: `Kenne ${PROFILE.firma} nicht.`,
    answer:
      "`Kein Wunder, noch jung am Markt — Fokus bewusst auf ${PROFILE.zielgruppe}.`",
     testsatz: "ihre firma kenne ich noch nicht nie gehört",
  },
  {
    id: "vertrauen-referenzen",
    category: "vertrauen",
    search: "referenzen kunden beispiele betreuen erfahrung vorzeigen wen",
    question: "Haben Sie Referenzen aus unserer Branche?",
    answer:
      "Noch nicht — wir starten gerade mit Gründungskunden. Genau deshalb ist der Termin kostenlos und der Einstieg günstiger als später.",
    ursache: "Soziale Absicherung fehlt.",
    formel: "Ehrlich sein, dann das Gründungskunden-Angebot erklären.",
     testsatz: "wen betreuen sie denn so haben sie referenzen",
  },
  {
    id: "vertrauen-wie-gross",
    category: "vertrauen",
    search: "firma einzelunternehmen allein gegründet groß",
    question: "Wie groß ist Ihre Firma? Sind Sie allein?",
    answer:
      "Einzelunternehmen, ich mache das selbst. Heißt: Sie sprechen direkt mit dem, der es umsetzt.",
     testsatz: "wie groß ist ihre firma sind sie allein",
  },
  {
    id: "vertrauen-konkurrenz",
    category: "vertrauen",
    search: "wettbewerber konkurrenz mitbewerber mitbewerbern konkurrenten",
    question: "Arbeiten Sie auch für Wettbewerber?",
    answer: "Verstehe die Frage. Darüber sprechen wir offen im Termin, bevor irgendetwas startet.",
     testsatz: "arbeiten sie auch für meine mitbewerber",
  },

  // ---------- Datenschutz & Technik ----------
  {
    id: "datenschutz-dsgvo",
    category: "datenschutz",
    search: "dsgvo datenschutz rechtlich erlaubt konform abmahnung datenschutzbeauftragter",
    question: "Ist das überhaupt DSGVO-konform?",
    answer:
      "Das ist der Kern: EU-gehostet, DSGVO-konform, kein Lock-in. Im Termin gehen wir Ihre Fälle konkret durch.",
     testsatz: "ist das denn überhaupt dsgvo konform",
  },
  {
    id: "datenschutz-wo-daten",
    category: "datenschutz",
    search: "daten server hosting speicher usa amerika europa gespeichert",
    question: "Wo liegen die Daten?",
    answer:
      "In der EU, und die Systeme laufen auf Ihren eigenen Accounts. Zeig ich Ihnen im Termin.",
     testsatz: "wo werden die daten denn gespeichert",
  },
  {
    id: "technik-aufwand",
    category: "datenschutz",
    search: "umstellen aufwand einrichtung installieren wechseln migration umziehen schulung",
    question: "Müssen wir unsere Systeme umstellen?",
    answer:
      "Nein, es setzt auf dem auf, was Sie schon nutzen. Was das für Sie heißt, klären die 30 Minuten.",
     testsatz: "müssen wir dann alles umstellen",
  },
  {
    id: "technik-keine-it",
    category: "datenschutz",
    search: "edv techniker administrator informatiker betreuen wartung",
    question: "Wir haben niemanden für Technik. Wer macht das?",
    answer:
      "Das übernehme ich. Sie müssen dafür niemanden abstellen — auch das klären wir im Termin.",
     testsatz: "wir haben keinen techniker der sowas betreut",
  },

  // ---------- Zuständigkeit ----------
  {
    id: "zustaendig-nicht-ich",
    category: "zustaendig",
    search: "zuständig kollege abteilung bereich falsch verbunden",
    question: "Dafür bin ich nicht zuständig.",
    answer: "Danke, dann halte ich Sie nicht auf. Mit wem spreche ich da am besten?",
     testsatz: "dafür bin ich gar nicht zuständig",
  },
  {
    id: "zustaendig-chef-nicht-da",
    category: "zustaendig",
    search: "chef geschäftsführer inhaber abwesend vorgesetzter",
    question: "Der Chef ist nicht da.",
    answer: "Kein Problem. Wann erreiche ich ihn am besten?",
     testsatz: "der geschäftsführer ist heute nicht im hause",
  },
  {
    id: "zustaendig-intern-besprechen",
    category: "zustaendig",
    search: "besprechen abstimmen rücksprache gremium entscheiden partner",
    question: "Das müssen wir intern besprechen.",
    answer:
      "Klar. Dann nehmen wir die Person am besten gleich mit dazu — 30 Minuten, kostenlos. Wen bräuchten Sie dafür?",
    ursache: "Entscheidung liegt nicht allein bei ihm, oder höfliche Vertagung.",
    formel: "Mitentscheider in den Termin holen statt auf Rückmeldung warten.",
     testsatz: "das müssen wir intern noch besprechen",
  },
  {
    id: "zustaendig-zentrale",
    category: "zustaendig",
    search: "zentrale hauptsitz franchise verwaltung sekretariat weiterleiten",
    question: "Wenden Sie sich an die Zentrale.",
    answer:
      "Mach ich gern. Ob Sie sich die 30 Minuten nehmen, entscheiden Sie vor Ort aber selbst, oder?",
     testsatz: "wenden sie sich bitte an die zentrale",
  },

  // ---------- Ablauf ----------
  {
    id: "ablauf-was-passiert",
    category: "ablauf",
    search: "passiert ablauf inhalt erwartet besteht ablaufen",
    question: "Was passiert in diesen 30 Minuten?",
    answer:
      "Wir schauen auf Ihre Abläufe: wo Anfragen liegen bleiben und wo Zeit verloren geht. Am Ende wissen Sie, wo es hakt.",
     testsatz: "was passiert denn in diesem gespräch",
  },
  {
    id: "ablauf-zu-lang",
    category: "ablauf",
    search: "lang dauert minuten zeitrahmen kürzer stunde halbe",
    question: "30 Minuten sind zu lang.",
    answer:
      "Dann machen wir 15. Reicht, um die größten Punkte zu zeigen. Diese oder nächste Woche?",
     testsatz: "dreißig minuten sind mir ehrlich zu lang",
  },
  {
    id: "ablauf-jetzt-gleich",
    category: "ablauf",
    search: "sofort telefonisch telefon durchsprechen",
    question: "Können wir das nicht gleich am Telefon machen?",
    answer:
      "Gern, nur brauche ich dafür Ihre Zahlen vor Augen. Deshalb ein eigener Termin — 30 Minuten, kostenlos.",
     testsatz: "können sie mir das nicht sofort am telefon durchsprechen",
  },
  {
    id: "ablauf-link-ansehen",
    category: "ablauf",
    search: "link website webseite homepage anschauen internet",
    question: "Schicken Sie mir einen Link, ich schau's mir an.",
    answer:
      "Mach ich. Der eigentliche Wert steckt aber im Blick auf Ihre Abläufe — dafür die 30 Minuten.",
     testsatz: "schicken sie mir einen link zur webseite",
  },

  // ---------- Mail ----------
  {
    id: "mail-unterlagen",
    category: "mail",
    search: "mail email unterlagen zusenden schicken infos prospekt",
    question: "Schicken Sie mir einfach eine Mail.",
    answer:
      "Mache ich gern. Bevor ich das tue: Ist das Thema Leadqualifizierung für Sie aktuell relevant oder eher nicht?",
    ursache: "Will das Gespräch beenden, echtes Interesse ist nicht erkennbar.",
    formel: "Grund fürs Gespräch nennen, dann ein Mini-Commitment abfragen.",
     testsatz: "schicken sie mir doch unterlagen per mail",
  },
  {
    id: "mail-info-adresse",
    category: "mail",
    search: "info postfach mailadresse schreiben kontaktformular",
    question: "Schreiben Sie an info@…",
    answer:
      "Mach ich. Damit es nicht untergeht: Darf ich Ihnen parallel eine Kalendereinladung schicken?",
     testsatz: "schreiben sie einfach an unsere info adresse",
  },

  // ---------- Neu aus dem Einwand-Schema ----------
  {
    id: "loesung-intern",
    category: "loesung",
    search: "intern inhouse eigenregie hausintern excel tabelle",
    question: "Wir machen das intern.",
    answer:
      "Prima. Was nutzen Sie dafür? Ich frage, weil viele sagen, sie machen es intern, und meinen damit Excel oder ein CRM ohne Automatisierung.",
    ursache: "Kontrollbedürfnis oder eine halbfertige Eigenlösung.",
    formel: "Nachfragen, was genau intern läuft.",
     testsatz: "das machen wir bei uns intern",
  },
  {
    id: "loesung-portal",
    category: "loesung",
    search: "portal portale plattform marktplatz weitergeleitet durchgestellt",
    question: "Unser Portal schickt die Anfragen schon durch.",
    answer:
      "Wie viele dieser Anfragen werden tatsächlich zu Terminen? Portale sind gut in der Verteilung, die Qualifizierung danach bleibt trotzdem meist manuell.",
    ursache: "Der Portal-Autoresponder wird als Lösung gesehen.",
    formel: "Conversion-Frage stellen.",
     testsatz: "das portal schickt uns die anfragen ja schon durch",
  },
  {
    id: "loesung-chatbot",
    category: "loesung",
    search: "chatbot bot livechat websitechat dialogsystem website",
    question: "Wir haben einen Chatbot auf der Website.",
    answer:
      "Super. Bewertet der Chatbot, ob jemand Käufer oder Verkäufer ist, welche Preisvorstellung er hat, und bucht er direkt einen Termin in Ihren Kalender? Oder sammelt er erst mal nur Kontaktdaten?",
    ursache: "Werkzeug vorhanden, aber unklar wie tief es geht.",
    formel: "Die Tiefe des Systems testen.",
     testsatz: "wir haben einen chatbot auf der website",
  },
  {
    id: "loesung-anbieter-eingebaut",
    category: "loesung",
    search: "eingebaut softwareanbieter feature mitgeliefert aktiviert modul",
    question: "Das hat unser Software-Anbieter schon eingebaut.",
    answer:
      "Oft ist das ein Feature, das man aktivieren kann, aber niemand betreut. Wer prüft bei Ihnen, ob das wirklich funktioniert und die Raten steigen?",
    ursache: "Vertrauen in den bestehenden Anbieter, Wechselresistenz.",
    formel: "Feature und System unterscheiden.",
     testsatz: "das hat uns unser softwareanbieter schon eingebaut",
  },
  {
    id: "preis-zu-teuer",
    category: "preis",
    search: "teuer happig unverschämt preislich zuviel",
    question: "Zu teuer.",
    answer:
      "Was verdienen Sie an einem Auftrag im Schnitt? Ein zusätzlicher Abschluss pro Quartal, den das System sichert, deckt die Jahreskosten. Rechnen wir das kurz durch?",
    ursache: "ROI nicht klar, oder Vergleich mit einem falschen Referenzpunkt.",
    formel: "ROI-Frage stellen und die Zahlen selbst rechnen lassen.",
     testsatz: "das ist mir ehrlich zu teuer",
  },
  {
    id: "preis-490-klein",
    category: "preis",
    search: "monatlich abo monat gebühr laufend",
    question: `${PROFILE.preis} ist viel für ein kleines Büro.`,
    answer:
      "Wie viele qualifizierte Anfragen verlieren Sie aktuell, weil Sie nicht schnell genug antworten können? Eine davon wäre mehr wert als ein Jahr Abo.",
    ursache: "Die Kosten-Nutzen-Relation ist nicht sichtbar.",
    formel: "Opportunity-Cost-Frage stellen.",
     testsatz: "die monatliche gebühr ist mir ehrlich zu hoch",
  },
  {
    id: "preis-toolkosten",
    category: "preis",
    search: "toolkosten tools gesamtkosten versteckte aufschlag zusätzlich lizenzen",
    question: "Was kostet das alles zusammen, mit Tools?",
    answer:
      `Unsere Gebühr ist ${PROFILE.preis}. ${PROFILE.nebenkosten}.`,
    ursache: "Angst vor versteckten Kosten.",
    formel: "Transparent aufschlüsseln.",
     testsatz: "was kosten denn die tools zusätzlich",
  },
];

/**
 * Alltagssaetze aus der eigenen Branche, die NICHTS ausloesen duerfen.
 * Sie sind der wichtigere Teil des Tests: ein falscher Vorschlag mitten im
 * Gespraech ist schlimmer als gar keiner.
 *
 * Grenze: Das Mikrofon trennt die Sprecher nicht. Saetze, die der ANRUFER
 * sagt ("ich schicke Ihnen die Unterlagen", "ich melde mich nochmal"),
 * enthalten dieselben Woerter wie die zugehoerigen Einwaende und koennen
 * deshalb eine Karte ausloesen. Das laesst sich mit Wortlisten nicht trennen.
 */
export const RUHE_SAETZE: string[] = [
  "guten tag schön dass sie anrufen",
  "ja das klingt interessant erzählen sie mal",
  "ich bin seit zwanzig jahren in dem geschäft",
  "wir verkaufen hauptsächlich an gewerbekunden",
  "der auftrag ist letzte woche rausgegangen",
  "ja gerne dienstag um zehn passt mir gut",
  "ich schau mal eben in den kalender",
  "der markt ist gerade ziemlich schwierig",
  "haben sie unsere letzte rechnung erhalten",
  "wir haben nächste woche betriebsferien",
  "ich ruf sie gleich zurück",
  "einen moment bitte ich stelle sie durch",
  "mein name ist müller guten tag",
  "wir sitzen hier mitten in der innenstadt",
  "die zahlung läuft über die buchhaltung",
  "das angebot ist schon raus",
  "schönen tag noch auf wiederhören",
  "können sie das bitte wiederholen",
  "ja das habe ich verstanden",
  "die halle ist seit letztem jahr fertig",
  "wir sind hier zu dritt im betrieb",
  "wir arbeiten mit einem kollegen in münchen zusammen",
  "der kunde hat gestern abgesagt",
  "das projekt läuft seit drei monaten",
];
