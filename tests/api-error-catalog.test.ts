import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { repoFiles } from "../scripts/repo-files.js";
import { errorTextFindings } from "./helpers/error-texts";
import errors from "~/i18n/locales/de/errors";
import excel from "~/i18n/locales/de/excel";
import validation from "~/i18n/locales/de/validation";

// Error texts belong in i18n/locales/de/*.ts and reach the client through apiError (or XlsxError).
// An entry here needs a reason, for example operator-only text that never reaches a user.
const ALLOWED: Array<{ file: string; text: string; reason: string }> = [];

function leaves(node: unknown, path: string[] = []): Array<[string, string]> {
  if (typeof node === "string") return [[path.join("."), node]];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) => leaves(value, [...path, key]));
}

describe("API error catalog guard", () => {
  it("finds no error text outside the catalog under server/", () => {
    const files = repoFiles().filter((file: string) => /^server\/.*\.(?:ts|js|mjs)$/.test(file));
    const found = files.flatMap((file: string) => errorTextFindings(file, fs.readFileSync(file, "utf-8")));
    const unexplained = found.filter((hit) => !ALLOWED.some(({ file, text }) => hit.startsWith(`${file}:`) && hit.endsWith(text)));
    expect(unexplained).toEqual([]);
  });

  // Each line is one way around the catalog and must be reported with the given text; null lines are fine.
  const probes: Array<[string, string | null]> = [
    ['throw createError({ statusCode: 404, statusMessage: "Anfrage nicht gefunden" });', "Anfrage nicht gefunden"],
    ['throw createError({ statusCode: 400, statusMessage: "Ungültig" });', "Ungültig"],
    ["throw createError({ statusCode: 400, statusMessage: `${label}Pflichtfeld` });", "Pflichtfeld"],
    ['throw createError({ statusCode: 400, statusMessage: `${"Fehlt"}` });', "Fehlt"],
    ['throw createError({ statusCode: 502, statusMessage: "Bad gateway" });', "Bad gateway"],
    ["throw createError(MESSAGE);", "createError"],
    ['import { createError as httpError } from "h3"; throw httpError({ statusCode: 400, message: "Zu alt" });', "Zu alt"],
    ['throw { statusCode: 400, statusMessage: "Nein" };', "statusMessage"],
    ["const error = { statusCode: 400, statusMessage };", "statusMessage"],
    ['error.statusMessage = "Nein";', "statusMessage"],
    ['setResponseStatus(event, 400, "Nicht erlaubt");', "Nicht erlaubt"],
    ['throw new TypeError("Ungültiger Wert");', "Ungültiger Wert"],
    ["throw new RangeError(`Wert ${value} nicht erlaubt`);", " nicht erlaubt"],
    ['throw new Error("Datei fehlt");', "Datei fehlt"],
    ['throw new XlsxError("Kaputte Datei");', "Kaputte Datei"],
    ['throw new XlsxError("excel.file.notZip", { name: "a.xml" });', null],
    ['throw apiError(event, 404, "errors.requests.notFound");', null],
    ["throw new Error(`Relay responded with ${status}`);", null],
    ["console.log(error.statusMessage);", null],
  ];

  it.each(probes)("checks %s", (source, expected) => {
    const found = errorTextFindings("x.ts", source);
    if (expected === null) expect(found).toEqual([]);
    else expect(found).toContain(`x.ts:1 ${expected}`);
  });

  it("lets api-error.ts build the error itself", () => {
    const source = "return createError({ statusCode, statusMessage: text, message: text, data: { code: key, params } });";
    expect(errorTextFindings("server/utils/api-error.ts", source)).toEqual([]);
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
