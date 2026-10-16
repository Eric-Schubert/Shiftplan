import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { isGermanProse } from "../scripts/check-english.js";
import { tokenize } from "../scripts/english/tokenize.js";
import { repoFiles } from "../scripts/repo-files.js";
import errors from "~/i18n/locales/de/errors";
import excel from "~/i18n/locales/de/excel";
import validation from "~/i18n/locales/de/validation";

type Token = { kind: string; text: string; line: number };

// Error texts belong in i18n/locales/de/*.ts and reach the client through apiError (or XlsxError).
// An entry here needs a reason, for example operator-only text that never reaches a user.
const ALLOWED: Array<{ file: string; text: string; reason: string }> = [];

const isProse = (text: string) => /\p{L}+\s+\p{L}/u.test(text);
const isGerman = (text: string) => /[äöüß]/i.test(text) || isGermanProse(text);
// createError and XlsxError take no text at all, only catalog keys; plain errors are English operator messages.
const ERROR_CALLS: Array<{ words: string[]; flags: (text: string) => boolean }> = [
  { words: ["createError"], flags: isProse },
  { words: ["new", "XlsxError"], flags: isProse },
  { words: ["new", "Error"], flags: isGerman },
];

/** Text of a string token or template piece without its quotes and `${` ends. */
function stringContent(text: string): string {
  return text.replace(/^["'`}]/, "").replace(/(?:["'`]|\$\{)$/, "");
}

/** Message text inside createError(...) and German inside new Error(...), as "file:line text". */
export function errorTextLiterals(file: string, source: string): string[] {
  const tokens = (tokenize(source) as Token[]).filter((token) => token.kind !== "comment");
  const found: string[] = [];
  tokens.forEach((token, index) => {
    const call = ERROR_CALLS.find(({ words }) => words.every((word, offset) => tokens[index + offset]?.text === word));
    if (!call || token.kind !== "word" || tokens[index + call.words.length]?.text !== "(") return;
    let depth = 0;
    for (let at = index + call.words.length; at < tokens.length; at++) {
      const { kind, text, line } = tokens[at]!;
      if (kind === "punct" && text === "(") depth += 1;
      if (kind === "punct" && text === ")" && --depth === 0) break;
      const content = kind === "string" ? stringContent(text) : "";
      if (call.flags(content)) found.push(`${file}:${line} ${content}`);
    }
  });
  return found;
}

function leaves(node: unknown, path: string[] = []): Array<[string, string]> {
  if (typeof node === "string") return [[path.join("."), node]];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) => leaves(value, [...path, key]));
}

describe("API error catalog guard", () => {
  it("finds no message text in createError and no German in new Error under server/", () => {
    const files = repoFiles().filter((file: string) => /^server\/.*\.(?:ts|js|mjs)$/.test(file));
    const found = files.flatMap((file: string) => errorTextLiterals(file, fs.readFileSync(file, "utf-8")));
    const unexplained = found.filter((hit) => !ALLOWED.some(({ file, text }) => hit.startsWith(`${file}:`) && hit.endsWith(text)));
    expect(unexplained).toEqual([]);
  });

  it("catches literals, templates and multi-line calls, but not keys or English operator errors", () => {
    const source = [
      'throw createError({ statusCode: 404, statusMessage: "Anfrage nicht gefunden" });',
      "throw createError({",
      "  statusCode: 400,",
      "  statusMessage: `${label} muss eine ganze Zahl sein`,",
      "});",
      'throw new Error("Ungültige Excel-Datei");',
      'throw apiError(event, 404, "errors.requests.notFound");',
      'throw new Error(`Relay responded with ${status}`);',
      'throw createError({ statusCode: 500, statusMessage: getMessage("x") });',
      'throw new XlsxError("excel.file.notZip");',
      'throw createError({ statusCode: 502, statusMessage: "Bad gateway" });',
    ].join("\n");
    expect(errorTextLiterals("x.ts", source)).toEqual([
      "x.ts:1 Anfrage nicht gefunden",
      "x.ts:4  muss eine ganze Zahl sein",
      "x.ts:6 Ungültige Excel-Datei",
      "x.ts:11 Bad gateway",
    ]);
  });
});

describe("Message catalogs", () => {
  const messages = leaves({ errors, validation, excel });

  it("only use {name} placeholders and no vue-i18n special characters", () => {
    const unsafe = messages.filter(([, text]) => /[@$|{}]/.test(text.replace(/\{\w+\}/g, "")));
    expect(unsafe).toEqual([]);
  });

  it("have camelCase or API field keys", () => {
    const badKeys = messages.map(([key]) => key).filter((key) => !/^[a-z][A-Za-z0-9_]*(?:\.[a-z][A-Za-z0-9_]*)*$/.test(key));
    expect(badKeys).toEqual([]);
  });
});
