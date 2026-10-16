import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { repoFiles } from "../scripts/repo-files.js";
import { germanLiterals } from "./helpers/german-literals";
import { PENDING_LEGAL } from "./helpers/i18n-pending";

// All app code takes its texts from the catalog (i18n/locales). German here is a text that missed it.
const APP_CODE = /^(?:components|layouts|pages|composables|stores|types|utils|plugins|shared)\/.*\.(?:vue|ts|js)$|^(?:app|error)\.vue$/;
const PENDING = new Set(PENDING_LEGAL);

describe("app code", () => {
  const files = repoFiles().filter((file) => APP_CODE.test(file));
  const german = (file: string) => germanLiterals(file, fs.readFileSync(file, "utf-8"));

  it("has no German text outside the catalog, except in the pending files", () => {
    const findings = files.filter((file) => !PENDING.has(file)).flatMap((file) => german(file).map((found) => `${file}:${found}`));
    expect(files.length).toBeGreaterThan(200);
    expect(findings).toEqual([]);
  });

  it("lists only pending files that exist and still hold German", () => {
    expect([...PENDING].filter((file) => !files.includes(file) || german(file).length === 0)).toEqual([]);
  });
});

describe("German text guard", () => {
  it("finds any word in markup and readable attributes, technical attributes aside", () => {
    const source = [
      '<template><p title="Woche" class="planner-chip">Heute</p><PrimeSelect empty-message="Keine Daten" icon="pi pi-x" />',
      '<PrimeToggleButton on-label="An" off-label="Aus" id="anfragen" /><!-- Kommentar für Entwickler --></template>',
    ].join("\n");
    expect(germanLiterals("components/A.vue", source)).toEqual(["1: Woche", "1: Heute", "1: Keine Daten", "2: An", "2: Aus"]);
  });

  it("checks value-like attributes as code: a shown value counts, a field name does not", () => {
    const source = [
      '<template><PrimeTag value="Inaktiv" /><PrimeTag value="Teilzeit" severity="info" /><PrimeColumn field="name" />',
      '<PrimeSelect option-label="label" name="role" /><PrimeTab value="Vorschau" /><PrimeTag value="Start" /></template>',
    ].join("\n");
    expect(germanLiterals("components/E.vue", source)).toEqual(["1: Inaktiv", "1: Teilzeit", "2: Vorschau", "2: Start"]);
  });

  it("finds German words in scripts and bindings without umlauts or two stopwords", () => {
    const source = [
      "<script setup>",
      "// Kommentar über die Woche",
      'const title = "Neue Anfrage"; const options = { open: "Offen" }; const label = "Schicht " + name;',
      'throw new Error("Speichern fehlgeschlagen");',
      "const greeting = `Hallo ${name}, schön dich zu sehen`;",
      "</script>",
      "<template><PrimeButton :label=\"'Speichern'\" :aria-label=\"open ? 'Schließen' : t('common.actions.close')\" /></template>",
    ].join("\n");
    expect(germanLiterals("components/B.vue", source)).toEqual([
      "3: Neue Anfrage",
      "3: Offen",
      "3: Schicht",
      "4: Speichern fehlgeschlagen",
      "5: Hallo {}, schön dich zu sehen",
      "7: Speichern",
      "7: Schließen",
    ]);
  });

  it("checks plain scripts too", () => {
    expect(germanLiterals("utils/c.js", 'export const hint = "Bitte warten";\n// Hinweis für später')).toEqual(["1: Bitte warten"]);
  });

  it("leaves wire values, holiday names from the API, the brand, keys and code words alone", () => {
    const source = [
      '<template><h1>Shiftplan</h1><p>{{ t("app.layout.imprint") }} · {{ count }}</p><a href="/impressum" /></template>',
      '<script setup>const reason = "urlaub"; const query = "?einladung=1"; const name = "Buß- und Bettag";',
      'const key = "schichtplaner_pushPromptDismissed"; const kind = state === "takeover" ? "updated" : "/settings";</script>',
    ].join("\n");
    expect(germanLiterals("components/D.vue", source)).toEqual([]);
  });
});
