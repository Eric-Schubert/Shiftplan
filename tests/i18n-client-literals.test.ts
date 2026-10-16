import fs from "node:fs";
import { parse } from "vue/compiler-sfc";
import { describe, expect, it } from "vitest";
import { ALLOWED_IDENTIFIERS, isGermanProse } from "../scripts/check-english.js";
import { tokenize } from "../scripts/english/tokenize.js";
import { repoFiles } from "../scripts/repo-files.js";
import { SHORT_NAME_KEYS } from "~/utils/holiday";

// App code whose texts come from the catalog (i18n/locales). German here is a text that missed it.
const CONVERTED = /^(?:components\/(?:app|form|member|planner|prime)\/|layouts\/|composables\/|stores\/|types\/|utils\/|plugins\/)|^(?:app|error)\.vue$|^pages\/(?:index|settings)\.vue$/;
// Still German until their step of the i18n plan: settings features, legal texts, sign-in forms.
const PENDING = [
  /^composables\/(?:useRotation\w*|useYearCopy|useImprintContactForm)\.ts$/,
  /^utils\/(?:account-forms|client-config)\.ts$/,
  /^utils\/(?:analytics|legal)\//,
  /^stores\/auth\.store\.ts$/,
];
// Wire values and data that stay German: query parameters, absence reasons, holiday names from the API.
const ALLOWED = new Set([...ALLOWED_IDENTIFIERS, ...Object.keys(SHORT_NAME_KEYS), "Shiftplan"]);
// Attributes people read; any word in them belongs in the catalog.
const TEXT_ATTRS = /^(?:label|header|placeholder|title|aria-label|alt|summary|detail)$/;

type Finding = { line: number; text: string };

/** Strings in code: plain literals and the pieces of template literals, without comments. */
function codeStrings(source: string, firstLine: number): Finding[] {
  return tokenize(source, firstLine)
    .filter((token: { kind: string }) => token.kind === "string")
    .map((token: { text: string; line: number }) => ({ line: token.line, text: token.text.replace(/^[`'"}]|(?:\$\{|[`'"])$/g, "") }));
}

/** Text nodes and readable attributes of a template, plus the strings in its expressions. */
function templateTexts(node: any, found: { markup: Finding[]; code: Finding[] }) {
  for (const prop of node.props ?? []) {
    const line = prop.loc.start.line;
    if (prop.type === 6 && prop.value && TEXT_ATTRS.test(prop.name)) found.markup.push({ line, text: prop.value.content });
    if (prop.type === 7 && prop.exp) found.code.push(...codeStrings(prop.exp.content, line));
  }
  for (const child of node.children ?? []) {
    if (child.type === 2) found.markup.push({ line: child.loc.start.line, text: child.content });
    else if (child.type === 5) found.code.push(...codeStrings(child.content.content, child.loc.start.line));
    else templateTexts(child, found);
  }
}

/** German strings of one file as "line: text". Markup counts at any word, code by the prose rule. */
function germanLiterals(file: string, source: string): string[] {
  const found = { markup: [] as Finding[], code: [] as Finding[] };
  if (file.endsWith(".vue")) {
    const { descriptor } = parse(source, { filename: file });
    for (const block of [descriptor.script, descriptor.scriptSetup]) {
      if (block) found.code.push(...codeStrings(block.content, block.loc.start.line));
    }
    if (descriptor.template?.ast) templateTexts(descriptor.template.ast, found);
  } else found.code.push(...codeStrings(source, 1));

  const markup = found.markup.filter(({ text }) => /\p{L}{2}/u.test(text) && !ALLOWED.has(text.trim()));
  const code = found.code.filter(({ text }) => isGermanProse(text) && !ALLOWED.has(text));
  return [...markup, ...code].sort((a, b) => a.line - b.line).map(({ line, text }) => `${line}: ${text.trim()}`);
}

describe("converted app code", () => {
  it("has no German text left outside the catalog", () => {
    const files = repoFiles().filter((file) => CONVERTED.test(file) && /\.(?:vue|ts)$/.test(file) && !PENDING.some((rule) => rule.test(file)));
    const findings = files.flatMap((file) => germanLiterals(file, fs.readFileSync(file, "utf-8")).map((found) => `${file}:${found}`));
    expect(files.length).toBeGreaterThan(100);
    expect(findings).toEqual([]);
  });

  it("finds German in template text, attributes, expressions and scripts", () => {
    const source = [
      "<script setup>",
      "// Kommentar über die Woche",
      'const fallback = error || "Das hat nicht geklappt";',
      "const greeting = `Hallo ${name}, schön dich zu sehen`;",
      "</script>",
      '<template><p title="Woche">Heute</p><span :aria-label="open ? \'Schließen\' : t(\'common.actions.close\')"></span>',
      "<!-- Kommentar für Entwickler --></template>",
    ].join("\n");
    expect(germanLiterals("components/A.vue", source)).toEqual([
      "3: Das hat nicht geklappt",
      "4: , schön dich zu sehen",
      "6: Woche",
      "6: Heute",
      "6: Schließen",
    ]);
  });

  it("leaves wire values, holiday names from the API, the brand and keys alone", () => {
    const source = [
      '<template><h1>Shiftplan</h1><p>{{ t("app.layout.imprint") }} · {{ count }}</p></template>',
      '<script setup>const reason = "urlaub"; const query = "?einladung=1"; const name = "Buß- und Bettag";</script>',
    ].join("\n");
    expect(germanLiterals("components/B.vue", source)).toEqual([]);
  });
});
