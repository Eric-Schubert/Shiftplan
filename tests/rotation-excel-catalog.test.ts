import { describe, expect, it } from "vitest";
import { LOCALES } from "~/i18n/config";
import { t } from "~/i18n/server";
import type { MessageKey } from "~/i18n/types";
import { normalizeLabel, normalizeName } from "~/server/services/rotation-excel/cells";
import { sheetRef } from "~/server/services/rotation-excel/dropdown";

type Translate = (locale: string, key: MessageKey, params?: Record<string, string | number>) => string;

const FIELDS = ["startYear", "startWeek", "cycleLength", "staff", "shift", "patternWeek", "shiftId"] as const;
const SHEETS = ["instructions", "rotation", "shifts"] as const;

/**
 * Catalog texts the import would mix up once several locales exist: it reads the labels, free words
 * and the rotation sheet name of all of them at once.
 */
function catalogProblems(locales: readonly string[], translate: Translate): string[] {
  const problems: string[] = [];
  const everywhere = (key: MessageKey, normalize = normalizeLabel) => new Set(locales.map((locale) => normalize(translate(locale, key))));
  const fields = FIELDS.map((field) => [field, everywhere(`excel.labels.${field}`)] as const);

  fields.forEach(([field, labels], index) => {
    for (const [other, otherLabels] of fields.slice(index + 1)) {
      for (const label of labels) if (otherLabels.has(label)) problems.push(`${field} and ${other} share "${label}"`);
    }
  });
  const labels = new Set(fields.flatMap(([, set]) => [...set]));
  for (const free of everywhere("excel.labels.free")) if (labels.has(free)) problems.push(`free word "${free}" is a label`);

  for (const locale of locales) {
    const week = normalizeLabel(translate(locale, "excel.labels.week", { week: "#" }));
    if (week.split("#").length !== 2 || week.replace("#", "").trim() === "") {
      problems.push(`${locale}: week label "${week}" needs text around {week}`);
    }
    const names = SHEETS.map((sheet) => translate(locale, `excelTemplate.sheets.${sheet}`));
    for (const name of names.filter((entry) => entry.length > 31 || /[[\]:*?/\\]/.test(entry))) {
      problems.push(`${locale}: sheet name "${name}" is not allowed in Excel`);
    }
    if (new Set(names.map(normalizeName)).size !== names.length) problems.push(`${locale}: sheet names repeat`);
  }

  const rotation = everywhere("excelTemplate.sheets.rotation", normalizeName);
  for (const sheet of ["instructions", "shifts"] as const) {
    for (const name of everywhere(`excelTemplate.sheets.${sheet}`, normalizeName)) {
      if (rotation.has(name)) problems.push(`${sheet} sheet "${name}" is a rotation sheet name`);
    }
  }
  return problems;
}

describe("Rotation Excel catalog", () => {
  it("keeps labels, free words and sheet names apart in every locale", () => {
    expect(catalogProblems(LOCALES, t)).toEqual([]);
  });

  it("reports what a new locale could get wrong", () => {
    const fake: Record<string, string> = {
      "excel.labels.staff": "Schicht",
      "excel.labels.free": "Startjahr",
      "excel.labels.week": "{week}",
      "excelTemplate.sheets.instructions": "Plan: A/B",
      "excelTemplate.sheets.shifts": "Rotation",
    };
    const translate: Translate = (locale, key, params) =>
      locale === "xx" && fake[key] ? fake[key].replace("{week}", String(params?.week)) : t(locale, key, params);

    expect(catalogProblems(["de", "xx"], translate)).toEqual([
      'staff and shift share "schicht"',
      'free word "startjahr" is a label',
      'xx: week label "#" needs text around {week}',
      'xx: sheet name "Plan: A/B" is not allowed in Excel',
      "xx: sheet names repeat",
      'shifts sheet "rotation" is a rotation sheet name',
    ]);
  });

  it.each([
    ["Schichten", "Schichten"],
    ["Rota", "Rota"],
    ["Übersicht", "Übersicht"],
    ["Shift list", "'Shift list'"],
    ["O'Brien", "'O''Brien'"],
    ["AB1", "'AB1'"],
    ["R1C1", "'R1C1'"],
    ["R", "'R'"],
    ["C2", "'C2'"],
  ])("writes the sheet %s as %s in formulas", (name, ref) => {
    expect(sheetRef(name)).toBe(ref);
  });
});
