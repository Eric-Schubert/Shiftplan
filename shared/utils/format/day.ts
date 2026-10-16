import { parseISODate } from "../iso-date";
import { cached } from "./cache";
import { fill, patternsFor } from "./patterns";

/** How a calendar day is written; the examples are German. */
export type DayStyle =
  | "weekday-date" // „Do. 08.10.“ in lists, pushes and audit notes
  | "weekday" //      „Do“ in column heads and weekday runs
  | "date" //         „08.10.“
  | "intl"; //        „Do., 08.10.“ as Intl writes it, for holidays and analytics

const OPTIONS: Record<Exclude<DayStyle, "weekday-date">, Intl.DateTimeFormatOptions> = {
  weekday: { weekday: "short" },
  date: { day: "2-digit", month: "2-digit" },
  intl: { weekday: "short", day: "2-digit", month: "2-digit" },
};

// Calendar dates carry no time, so they are formatted in UTC and never shift a day.
function formatFor(locale: string, style: Exclude<DayStyle, "weekday-date">): Intl.DateTimeFormat {
  return cached(`day|${locale}|${style}`, () => new Intl.DateTimeFormat(locale, { ...OPTIONS[style], timeZone: "UTC" }));
}

/** A YYYY-MM-DD date in the given style; anything else comes back unchanged. */
export function formatDay(locale: string, date: string, style: DayStyle = "weekday-date"): string {
  const parsed = parseISODate(date);
  if (!parsed) return date;
  const day = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  if (style !== "weekday-date") return formatFor(locale, style).format(day);
  const parts = formatFor(locale, "intl").formatToParts(day);
  return fill(patternsFor(locale).day, Object.fromEntries(parts.map((part) => [part.type, part.value])));
}

/** „Do. 08.10.“ for one day, „Mo. 12.10. – Fr. 23.10.“ for a range. */
export function formatDayRange(locale: string, from: string, to: string, style: DayStyle = "weekday-date"): string {
  if (from === to) return formatDay(locale, from, style);
  return fill(patternsFor(locale).range, { from: formatDay(locale, from, style), to: formatDay(locale, to, style) });
}

function nextDay(date: string): string {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
}

/** „Mo–Fr“, „Mo, Di“ or „Mo, Mi–Fr“: runs of three or more days are joined. */
export function formatWeekdays(locale: string, dates: string[]): string {
  const patterns = patternsFor(locale);
  const runs: string[][] = [];
  for (const date of [...new Set(dates)].sort()) {
    const run = runs.at(-1);
    if (run && nextDay(run.at(-1)!) === date) run.push(date);
    else runs.push([date]);
  }
  const weekday = (date: string) => formatDay(locale, date, "weekday");
  return runs
    .map((run) =>
      run.length >= 3
        ? fill(patterns.weekdayRun, { from: weekday(run[0]!), to: weekday(run.at(-1)!) })
        : run.map(weekday).join(patterns.listSeparator)
    )
    .join(patterns.listSeparator);
}
