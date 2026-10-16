import fs from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { tokenize } from "../scripts/english/tokenize.js";
import { repoFiles } from "../scripts/repo-files.js";
import { readZip } from "../server/lib/xlsx/zip-read";
import { hasGermanWord, stringTexts } from "./helpers/german-text";
import { pushTextFindings } from "./helpers/push-texts";
import { RotationExcelService, db, parseXlsx, useRotationExcelModules } from "./helpers/rotation-excel";

// Every catalog message and week label comes back as its bare parameters, so any other text came from
// somewhere else.
vi.mock("~/i18n/server", () => ({
  t: (_locale: string, _key: string, params: Record<string, unknown> = {}) => `‹${Object.values(params).join("|")}›`,
}));
vi.mock("~/shared/utils/format/week", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/shared/utils/format/week")>()),
  weekLabel: (_locale: string, week: number | string) => `‹${week}›`,
  weekOfYearLabel: (_locale: string, year: number, week: number) => `‹${week}|${year}›`,
}));

// The template and import code; texts belong in i18n/locales/de/excel*.ts.
const EXCEL_CODE = [
  /^server\/services\/rotation-excel(?:\.service\.ts$|\/)/,
  /^server\/lib\/xlsx\//,
  /^server\/utils\/xlsx\.ts$/,
  /^server\/api\/rotation\/excel-template\.get\.ts$/,
];
// Template words the shared detector misses: labels, sheet names, the free marker, hints.
const EXCEL_WORDS =
  /\b(?:startjahr|startwoche|zyklusl\w*|musterwoche|anleitung|frei|zeit|mindestbesetzung|tabelle|kalenderwoche\w*|beispiel|in zeile|mehr dazu im blatt|ausfuellen)\b/i;
// The calendar week abbreviation, only in capitals; the week formatters own it.
const WEEK_ABBREVIATION = /\bKW\b/;

/** German text in Excel code, as "file:line text"; regex literals count too, without the umlaut check. */
function excelTextFindings(file: string, source: string): string[] {
  const words = stringTexts(source)
    .filter(([, text]) => EXCEL_WORDS.test(text) || WEEK_ABBREVIATION.test(text))
    .map(([line, text]) => `${file}:${line} ${text}`);
  const patterns = (tokenize(source) as Array<{ kind: string; text: string; line: number }>)
    .filter(({ kind, text }) => kind === "regex" && (EXCEL_WORDS.test(text) || hasGermanWord(text)))
    .map(({ line, text }) => `${file}:${line} ${text}`);
  return [...new Set([...pushTextFindings(file, source), ...words, ...patterns])];
}

/** Text of the template that no catalog message produced, without the seeded names and times. */
function foreignTexts(file: Buffer): string[] {
  const workbook = parseXlsx(file);
  const sheetXml = [...readZip(file).entries()].filter(([path]) => path.startsWith("xl/worksheets/"));
  const validations = sheetXml.flatMap(([, xml]) => [...xml.toString("utf-8").matchAll(/ (?:prompt|error)="([^"]*)"/g)].map((match) => match[1]!));
  const texts = [
    ...workbook.sheets.map((sheet) => sheet.name),
    ...workbook.sheets.flatMap((sheet) => sheet.rows.flat()).filter((value) => typeof value === "string"),
    ...validations,
  ];
  return texts
    .map((text) => {
      // Parameters stay, so a fallback text passed into a message is still found.
      return String(text).replace(/[‹›|]|Anna Becker|Ben Wagner|Früh|Spät/g, "");
    })
    .filter((rest) => /\p{L}/u.test(rest));
}

describe("Rotation Excel texts", () => {
  useRotationExcelModules();

  it("come from the catalog, with people and shifts", () => {
    expect(foreignTexts(RotationExcelService.createTemplate())).toEqual([]);
  });

  it("come from the catalog before anyone or any shift exists", () => {
    db.prepare("DELETE FROM rotation_pattern").run();
    db.prepare("DELETE FROM staff").run();
    db.prepare("DELETE FROM shifts").run();

    expect(foreignTexts(RotationExcelService.createTemplate())).toEqual([]);
  });
});

describe("Rotation Excel text guard", () => {
  it("finds no German text in the template and import code", () => {
    const files = repoFiles().filter((file: string) => EXCEL_CODE.some((pattern) => pattern.test(file)));
    const found = files.flatMap((file: string) => excelTextFindings(file, fs.readFileSync(file, "utf-8")));

    expect(files).toEqual(expect.arrayContaining(["server/services/rotation-excel/instructions.ts", "server/lib/xlsx/write.ts"]));
    expect(found).toEqual([]);
  });

  // Each line must be reported with the given text; null lines are fine.
  const probes: Array<[string, string | null]> = [
    ['[{ value: "Startjahr", style: "label" }, config.start_year]', "Startjahr"],
    ["const header = `Woche ${week}\\n(${weeks})`;", "Woche {}\\n({})"],
    ['const SHIFTS_SHEET = "Schichten";', "Schichten"],
    ['const FREE = new Set(["frei", "-"]);', "frei"],
    ['const shown = value ? `„${value}“` : "nichts (frei)";', "nichts (frei)"],
    ['name: sheet.name || "Tabelle",', "Tabelle"],
    ['return `KW ${parts.join(", ")}`;', "KW {}"],
    ["const match = header.match(/^woche (\\d+)$/);", "/^woche (\\d+)$/"],
    ["const staffName = headers.findIndex((header) => /^mitarbeiter$/.test(header));", "/^mitarbeiter$/"],
    ['const hint = "Mehr dazu im Blatt";', "Mehr dazu im Blatt"],
    ['return normalizeHeader(value).replace(/ä/g, "ae");', null],
    ['const weeks = "kw";', null],
    ['t(locale, "excel.labels.startYear")', null],
    ['const fileName = "shiftplan-rotation-template.xlsx";', null],
    ['makeNameLookup(staff, "staff");', null],
  ];

  it.each(probes)("checks %s", (source, expected) => {
    const found = excelTextFindings("x.ts", source);
    if (expected === null) expect(found).toEqual([]);
    else expect(found).toContain(`x.ts:1 ${expected}`);
  });
});
