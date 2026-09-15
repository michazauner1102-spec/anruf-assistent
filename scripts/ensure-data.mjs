// Legt beim ersten Start die eigenen Inhaltsdateien aus den Vorlagen an.
// Diese Dateien werden von git ignoriert — eigene Texte landen nie im Repo.
import { copyFileSync, existsSync } from "node:fs";

const dateien = ["profile", "script", "objections"];
const angelegt = [];

for (const name of dateien) {
  const ziel = `src/data/${name}.ts`;
  if (!existsSync(ziel)) {
    copyFileSync(`src/data/${name}.example.ts`, ziel);
    angelegt.push(ziel);
  }
}

if (angelegt.length > 0) {
  console.log(`\n  Aus den Vorlagen angelegt:\n${angelegt.map((d) => `    ${d}`).join("\n")}`);
  console.log("  Bitte mit den eigenen Angaben füllen — beginnend mit profile.ts.\n");
}
