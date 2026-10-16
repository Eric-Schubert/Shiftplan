// German durations for the privacy policy: "90 Tage", "nach 90 Tagen", "ein Jahr", "nach 2 Jahren".

export type GrammaticalCase = "accusative" | "dative";

type Unit = { one: Record<GrammaticalCase, string>; many: Record<GrammaticalCase, string> };

const DAY: Unit = { one: { accusative: "einen Tag", dative: "einem Tag" }, many: { accusative: "Tage", dative: "Tagen" } };
const YEAR: Unit = { one: { accusative: "ein Jahr", dative: "einem Jahr" }, many: { accusative: "Jahre", dative: "Jahren" } };
const MINUTE: Unit = {
  one: { accusative: "eine Minute", dative: "einer Minute" },
  many: { accusative: "Minuten", dative: "Minuten" },
};
const HOUR: Unit = {
  one: { accusative: "eine Stunde", dative: "einer Stunde" },
  many: { accusative: "Stunden", dative: "Stunden" },
};

const DAYS_PER_YEAR = 365;
const MINUTES_PER_HOUR = 60;

function amount(count: number, unit: Unit, grammaticalCase: GrammaticalCase): string {
  return count === 1 ? unit.one[grammaticalCase] : `${count} ${unit.many[grammaticalCase]}`;
}

/** Always in days: 365 → "365 Tage". */
export function daysText(days: number, grammaticalCase: GrammaticalCase = "accusative"): string {
  return amount(days, DAY, grammaticalCase);
}

/** In whole years where the days add up to them: 365 → "ein Jahr", 730 → "2 Jahre", 90 → "90 Tage". */
export function periodText(days: number, grammaticalCase: GrammaticalCase = "accusative"): string {
  return days % DAYS_PER_YEAR === 0 ? amount(days / DAYS_PER_YEAR, YEAR, grammaticalCase) : amount(days, DAY, grammaticalCase);
}

/** In whole hours where the minutes add up to them: 30 → "30 Minuten", 120 → "2 Stunden". */
export function minutesText(minutes: number, grammaticalCase: GrammaticalCase = "accusative"): string {
  return minutes % MINUTES_PER_HOUR === 0 ? amount(minutes / MINUTES_PER_HOUR, HOUR, grammaticalCase) : amount(minutes, MINUTE, grammaticalCase);
}
