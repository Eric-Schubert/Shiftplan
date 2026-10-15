import { describe, expect, it } from "vitest";
import { findGerman, findGermanInFiles, isGermanIdentifier, isGermanProse } from "../scripts/check-english.js";

const kinds = (file: string, source: string) =>
  findGerman(file, source).map(({ line, kind }: { line: number; kind: string }) => `${line}:${kind}`);

describe("English check rules", () => {
  it("flags German prose by umlauts or two stopwords", () => {
    expect(isGermanProse("// Fließtext eines Rechtstexts")).toBe(true);
    expect(isGermanProse("// Die ID muss bleiben, wenn der Store sie verlinkt")).toBe(true);
    expect(isGermanProse("// Sign-in with short code and PIN")).toBe(false);
    expect(isGermanProse("// License: FSL-1.1-MIT, DIE-compatible")).toBe(false);
  });

  it("ignores quoted text, but not apostrophes", () => {
    expect(isGermanProse("// Anna works the „Frühschicht“ in week 41")).toBe(false);
    expect(isGermanProse('// Matches headers like "Woche 2 (KW 43)" and \'für\'')).toBe(false);
    expect(isGermanProse("// Don't touch die Werte, it's der Plan")).toBe(true);
  });

  it("flags German identifier stems except public wire values", () => {
    expect(isGermanIdentifier("firstKw")).toBe(true);
    expect(isGermanIdentifier("fruehschicht")).toBe(true);
    expect(isGermanIdentifier("earlyShift")).toBe(false);
    expect(isGermanIdentifier("einladung")).toBe(false);
    expect(isGermanIdentifier("urlaub")).toBe(false);
  });
});

describe("English check scanner", () => {
  it("reports comments and identifiers with their line, but not strings or regex literals", () => {
    const source = [
      'const label = "Urlaub für alle";',
      "const header = /^woche (\\d+)$/i;",
      "// Kürzel des Mitarbeiters",
      "const firstKw = 1;",
    ].join("\n");

    expect(kinds("a.ts", source)).toEqual(["3:comment", "4:identifier"]);
  });

  it("skips multi-line template literals, also with nested expressions", () => {
    const source = [
      "const xml = `<a>",
      "  // Das ist kein Kommentar, sondern Text",
      '  ${items.map((item) => `<b>${item ? "{" : "}"}</b>`).join("")}',
      "  firstKw und mehr</a>`;",
      "const secondKw = 2; /* über",
      "   mehrere Zeilen */",
    ].join("\n");

    expect(kinds("a.ts", source)).toEqual(["5:identifier", "5:comment"]);
  });

  it("checks script, style and markup comments in Vue files", () => {
    const source = [
      "<!-- Dienste, die die App anspricht -->",
      '<script setup lang="ts">',
      "const kuerzel = ref('');",
      "</script>",
      "<template><p>{{ kuerzel }} – Kürzel</p></template>",
      "<style scoped>",
      "/* größer und luftiger */",
      "</style>",
    ].join("\n");

    expect(kinds("a.vue", source)).toEqual(["1:comment", "3:identifier", "7:comment"]);
  });

  it("finds hash comments in shell and YAML outside quotes", () => {
    const source = ['echo "# kein Kommentar"', "count=$#", "# Lädt die Datenbank", "run: build # für CI"].join("\n");

    expect(kinds("a.sh", source)).toEqual(["3:comment", "4:comment"]);
    expect(kinds("a.yml", source)).toEqual(["3:comment", "4:comment"]);
  });

  it("checks test titles in test files and log messages everywhere", () => {
    const source = [
      'describe("Kürzel", () => {',
      '  it("signs in with short code and PIN", () => {});',
      "});",
      'console.warn("[absence] Übernahme-Anfrage nicht angelegt:", error.message);',
      "console.error(`[push] ${label}: ${count} Einträge`);",
    ].join("\n");

    expect(kinds("tests/a.test.ts", source)).toEqual(["1:test title", "4:log message", "5:log message"]);
    expect(kinds("server/a.ts", source)).toEqual(["4:log message", "5:log message"]);
  });

  it("only checks source files outside public/, type declarations and the app API spec", () => {
    const german = "// Die Datei ist nicht englisch\n";
    const files = ["a.ts", "public/sw.js", "types/a.d.ts", "docs/api/app-v1.yaml", "README.md", "b.mjs"];

    expect(findGermanInFiles(files, () => german).map(({ file }: { file: string }) => file)).toEqual(["a.ts", "b.mjs"]);
  });
});
