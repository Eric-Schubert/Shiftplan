// Where the app writes dates and weeks differently from what Intl alone gives. Intl writes
// „Do., 08.10.“, the app „Do. 08.10.“. Other locales get their row with their catalog; until
// then they use the German row.
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
  de: {
    day: "{weekday} {day}.{month}.",
    range: "{from} – {to}",
    weekdayRun: "{from}–{to}",
    listSeparator: ", ",
    week: "KW {week}",
    weekOfYear: "KW {week}/{year}",
  },
};

export function patternsFor(locale: string): LocalePatterns {
  return PATTERNS[locale.split("-")[0]!.toLowerCase()] ?? PATTERNS.de!;
}

/** Replaces each {name} with its value. */
export function fill(pattern: string, values: Record<string, string | number>): string {
  return pattern.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ""));
}
