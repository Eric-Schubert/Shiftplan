import { LOCALES } from "~/i18n/config";
import { t, type MessageParams } from "~/i18n/server";
import type { MessageKey } from "~/i18n/types";
import { normalizeLabel, normalizeName } from "~/server/services/rotation-excel/cells";

// What the import recognizes: the template's sheet name, labels and free marker in every app locale,
// so a file downloaded in any language imports, also after the user switched languages.

/** A template text in every app locale, without duplicates. */
export function textsInEveryLocale(key: MessageKey, params?: MessageParams): string[] {
  return [...new Set(LOCALES.map((locale) => t(locale, key, params)))];
}

const labels = (key: MessageKey) => textsInEveryLocale(key).map(normalizeLabel);

/** Normalized with normalizeLabel, like the headers they are compared with. */
export const LABELS = {
  startYear: labels("excel.labels.startYear"),
  startWeek: labels("excel.labels.startWeek"),
  cycleLength: labels("excel.labels.cycleLength"),
  staff: labels("excel.labels.staff"),
  shift: labels("excel.labels.shift"),
  patternWeek: labels("excel.labels.patternWeek"),
  shiftId: labels("excel.labels.shiftId"),
};

/** Normalized with normalizeName. */
export const ROTATION_SHEET_NAMES = textsInEveryLocale("excelTemplate.sheets.rotation").map(normalizeName);
export const FREE_MARKERS = new Set(["-", "–", ...textsInEveryLocale("excel.labels.free").map(normalizeName)]);

// The week column label split around its number: "Woche {week}" gives ["woche ", ""].
const WEEK_LABELS = textsInEveryLocale("excel.labels.week", { week: "#" }).map((text) =>
  normalizeLabel(text).split("#")
);

/** The pattern week of a normalized header like "woche 2", in any locale, or null. */
export function patternWeekOf(header: string): number | null {
  for (const [before = "", after = ""] of WEEK_LABELS) {
    if (!header.startsWith(before) || !header.endsWith(after)) continue;
    const number = header.slice(before.length, header.length - after.length);
    if (/^\d+$/.test(number)) return Number(number);
  }
  return null;
}
