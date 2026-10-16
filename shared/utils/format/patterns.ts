// Where the app writes dates and weeks differently from what Intl alone gives. Intl writes
// „Do., 08.10.“, the app „Do. 08.10.“. Rows are keyed by language tag; a tag without a row
// takes the row of its language („de-AT“ → „de-DE“), and every app locale needs a row (tested).
export interface LocalePatterns {
  /** Weekday and date from Intl's parts: {weekday}, {day}, {month}. */
  day: string;
  /** Two days or dates: {from}, {to}. */
  range: string;
  /** Joins a run of three or more weekdays: {from}, {to}. */
  weekdayRun: string;
  /** Separates days and runs in a list of weekdays. */
  listSeparator: string;
  week: string;
  weekOfYear: string;
}

const PATTERNS: Record<string, LocalePatterns> = {
  "de-DE": {
    day: "{weekday} {day}.{month}.",
    range: "{from} – {to}",
    weekdayRun: "{from}–{to}",
    listSeparator: ", ",
    week: "KW {week}",
    weekOfYear: "KW {week}/{year}",
  },
  // Intl writes „Thu 08/10“ already; the row keeps it that way and names weeks in words.
  "en-GB": {
    day: "{weekday} {day}/{month}",
    range: "{from} – {to}",
    weekdayRun: "{from}–{to}",
    listSeparator: ", ",
    week: "Week {week}",
    weekOfYear: "Week {week}/{year}",
  },
};
const FALLBACK = "de-DE";

/** Language tags with their own row. */
export const PATTERN_LOCALES = Object.keys(PATTERNS);

const language = (tag: string) => tag.split("-")[0]!.toLowerCase();

export function patternsFor(locale: string): LocalePatterns {
  const sameLanguage = PATTERN_LOCALES.find((tag) => language(tag) === language(locale));
  return PATTERNS[locale] ?? PATTERNS[sameLanguage ?? FALLBACK]!;
}

/** Replaces each {name} with its value. */
export function fill(pattern: string, values: Record<string, string | number>): string {
  return pattern.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ""));
}
