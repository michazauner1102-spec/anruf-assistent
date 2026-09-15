import { matchFromSpeech } from "@/lib/search";
import { OBJECTIONS } from "@/data/objections";

/** Je ein realistisch gesprochener Satz pro Einwand. */
const TREFFER: [string, string][] = [
  ["ja also ich hab gerade wirklich keine zeit dafür", "zeit-keine-zeit"],
  ["melden sie sich doch in ein paar monaten nochmal", "zeit-spaeter-melden"],
  ["ich bin gerade unterwegs zu einer besichtigung", "zeit-unterwegs"],
  ["worum geht es denn kommen sie bitte zum punkt", "zeit-worum-geht-es"],
  ["nein da hab ich kein interesse dran", "skepsis-kein-interesse"],
  ["bei uns läuft das eigentlich bestens so", "skepsis-laeuft-gut"],
  ["das ist doch nur so eine verkaufsmasche", "skepsis-versteckter-verkauf"],
  ["künstliche intelligenz ist nichts für unser haus", "skepsis-ki-nichts-fuer-uns"],
  ["immobilien sind ein vertrauensgeschäft das funktioniert so nicht", "skepsis-vertrauensgeschaeft"],
  ["wir kriegen jede woche solche anrufe das nervt", "skepsis-zu-viele-anrufe"],
  ["und was bringt mir das konkret", "skepsis-was-bringt-das"],
  
  ["wir haben schon so ein system das so was macht", "loesung-schon-system"],
  ["wir haben schon ein system das automatisch antwortet", "loesung-schon-system"],
  ["unser crm schickt doch automatische mails raus", "loesung-crm"],
  ["das machen wir bei uns intern", "loesung-intern"],
  ["das müssen wir intern noch besprechen", "zustaendig-intern-besprechen"],
  ["immoscout schickt uns die anfragen ja schon durch", "loesung-portal"],
  ["wir haben einen chatbot auf der website", "loesung-chatbot"],
  ["das hat uns unser softwareanbieter schon eingebaut", "loesung-anbieter-eingebaut"],
  ["das ist mir ehrlich zu teuer", "preis-zu-teuer"],
  ["die monatliche gebühr ist mir ehrlich zu hoch", "preis-490-klein"],
  ["was kosten denn die tools zusätzlich", "preis-toolkosten"],
  ["wir machen das lieber persönlich ohne automatisierung", "loesung-persoenlich"],
  ["das macht bei uns die agentur", "loesung-agentur"],
  ["wir nutzen doch schon chatgpt", "loesung-chatgpt"],
  ["das macht meine mitarbeiterin im backoffice", "loesung-eigenes-team"],
  ["wir haben genug aufträge und sind gut ausgelastet", "bedarf-genug-auftraege"],
  ["wir brauchen keine leads wir sind bei immoscout", "bedarf-keine-leads"],
  ["bewertungen sind uns eigentlich nicht wichtig", "bedarf-bewertungen-egal"],
  ["wir sind ein kleines haus dafür zu klein", "bedarf-zu-klein"],
  ["und was kostet das dann", "preis-was-kostet"],
  ["in welcher größenordnung bewegt sich das danach", "preis-danach"],
  ["dafür haben wir momentan nichts zum investieren", "preis-kein-budget"],
  ["kostenlos wo ist denn da der haken", "preis-wo-ist-haken"],
  ["woher haben sie überhaupt meine telefonnummer", "vertrauen-nummer"],
  ["ihre firma kenne ich noch nicht nie gehört", "vertrauen-unbekannt"],
  ["wen betreuen sie denn so haben sie referenzen", "vertrauen-referenzen"],
  ["wie groß ist ihre firma sind sie allein", "vertrauen-wie-gross"],
  ["arbeiten sie auch für meine mitbewerber", "vertrauen-konkurrenz"],
  ["ist das denn überhaupt dsgvo konform", "datenschutz-dsgvo"],
  ["wo werden die daten denn gespeichert", "datenschutz-wo-daten"],
  ["müssen wir dann alles umstellen", "technik-aufwand"],
  ["wir haben keinen techniker der sowas betreut", "technik-keine-it"],
  ["dafür bin ich gar nicht zuständig", "zustaendig-nicht-ich"],
  ["der geschäftsführer ist heute nicht im hause", "zustaendig-chef-nicht-da"],
  ["wenden sie sich bitte an die zentrale", "zustaendig-zentrale"],
  ["was passiert denn in diesem audit", "ablauf-was-passiert"],
  ["dreißig minuten sind mir ehrlich zu lang", "ablauf-zu-lang"],
  ["können sie mir das nicht sofort am telefon durchsprechen", "ablauf-jetzt-gleich"],
  ["schicken sie mir einen link zur webseite", "ablauf-link-ansehen"],
  ["schicken sie mir doch unterlagen per mail", "mail-unterlagen"],
  ["schreiben sie einfach an unsere info adresse", "mail-info-adresse"],
];

/** Alltagssaetze aus einem Maklergespraech, die NICHTS ausloesen duerfen. */
const RUHE: string[] = [
  "guten tag herr zauner schön dass sie anrufen",
  "ja das klingt interessant erzählen sie mal",
  "ich bin seit zwanzig jahren in dem geschäft",
  "wir verkaufen hauptsächlich eigentumswohnungen",
  "die wohnung ist letzte woche verkauft worden",
  "ja gerne dienstag um zehn passt mir gut",
  "ich schau mal eben in den kalender",
  "der markt ist gerade ziemlich schwierig",
  "haben sie das objekt in der musterstraße gesehen",
  "wir haben nächste woche betriebsferien",
  "ich ruf sie gleich zurück",
  "einen moment bitte ich stelle sie durch",
  "mein name ist müller guten tag",
  "wir sitzen hier mitten in der altstadt",
  "die finanzierung läuft über die sparkasse",
  "das exposé ist schon online",
  "schönen tag noch auf wiederhören",
  "können sie das bitte wiederholen",
  "ja das habe ich verstanden",
  "ich schicke ihnen die exposés nachher zu",
  "wir arbeiten mit einem kollegen in münchen zusammen",
  "der kunde hat gestern abgesagt",
  "das objekt steht seit drei monaten leer",
];

export const dynamic = "force-dynamic";

export async function GET() {
  const zeilen = [
    ...TREFFER.map(([satz, erwartet]) => {
      const treffer = matchFromSpeech(satz);
      const ist = treffer?.objection.id ?? null;
      return { art: "Treffer", ok: ist === erwartet, satz, erwartet, ist, ausloeser: treffer?.ausloeser ?? [] };
    }),
    ...RUHE.map((satz) => {
      const treffer = matchFromSpeech(satz);
      const ist = treffer?.objection.id ?? null;
      return { art: "Ruhe", ok: ist === null, satz, erwartet: null, ist, ausloeser: treffer?.ausloeser ?? [] };
    }),
  ];

  // Jeder Einwand braucht mindestens einen Testsatz
  const getestet = new Set(TREFFER.map(([, id]) => id));
  const ohneTest = OBJECTIONS.map((o) => o.id).filter((id) => !getestet.has(id));

  return Response.json({
    bestanden: zeilen.filter((z) => z.ok).length,
    gesamt: zeilen.length,
    einwaendeOhneTestsatz: ohneTest,
    fehler: zeilen.filter((z) => !z.ok),
  });
}
