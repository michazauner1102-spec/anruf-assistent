// Legt beim ersten Start src/data/profile.ts aus der Vorlage an, damit ein
// frisch geklontes Repo ohne manuellen Schritt startet.
import { copyFileSync, existsSync } from "node:fs";

const ziel = "src/data/profile.ts";
const vorlage = "src/data/profile.example.ts";

if (!existsSync(ziel)) {
  copyFileSync(vorlage, ziel);
  console.log(`\n  ${ziel} aus der Vorlage angelegt — bitte mit den eigenen Angaben füllen.\n`);
}
