import { inDays, inHoursOrMinutes, inYearsOrDays, type Amount } from "../durations";

// German durations for the privacy policy: "90 Tage", "nach 90 Tagen", "ein Jahr", "nach 2 Jahren".

export type GrammaticalCase = "accusative" | "dative";

type Unit = { one: Record<GrammaticalCase, string>; many: Record<GrammaticalCase, string> };

const UNITS: Record<Amount["unit"], Unit> = {
  day: { one: { accusative: "einen Tag", dative: "einem Tag" }, many: { accusative: "Tage", dative: "Tagen" } },
  year: { one: { accusative: "ein Jahr", dative: "einem Jahr" }, many: { accusative: "Jahre", dative: "Jahren" } },
  minute: { one: { accusative: "eine Minute", dative: "einer Minute" }, many: { accusative: "Minuten", dative: "Minuten" } },
  hour: { one: { accusative: "eine Stunde", dative: "einer Stunde" }, many: { accusative: "Stunden", dative: "Stunden" } },
};

function text({ count, unit }: Amount, grammaticalCase: GrammaticalCase): string {
  return count === 1 ? UNITS[unit].one[grammaticalCase] : `${count} ${UNITS[unit].many[grammaticalCase]}`;
}

/** Always in days: 365 → "365 Tage". */
export function daysText(days: number, grammaticalCase: GrammaticalCase = "accusative"): string {
  return text(inDays(days), grammaticalCase);
}

/** In whole years where the days add up to them: 365 → "ein Jahr", 730 → "2 Jahre", 90 → "90 Tage". */
export function periodText(days: number, grammaticalCase: GrammaticalCase = "accusative"): string {
  return text(inYearsOrDays(days), grammaticalCase);
}

/** In whole hours where the minutes add up to them: 30 → "30 Minuten", 120 → "2 Stunden". */
export function minutesText(minutes: number, grammaticalCase: GrammaticalCase = "accusative"): string {
  return text(inHoursOrMinutes(minutes), grammaticalCase);
}
