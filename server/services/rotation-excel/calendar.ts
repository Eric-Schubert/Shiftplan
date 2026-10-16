import { isoWeekMonday, isoWeekOfDate, isoWeeksBetween, toISOWeek, type ISOWeek } from "~/shared/utils/week";
import type { RotationConfig } from "~/types/rotation";

/** The next calendar weeks (from this week on) for every pattern week, index 0 = pattern week 1. */
export function upcomingCalendarWeeks(
  config: Pick<RotationConfig, "cycle_length" | "start_year" | "start_week">,
  occurrences: number,
  today = new Date()
): ISOWeek[][] {
  const current = isoWeekOfDate(today);
  const currentMonday = isoWeekMonday(current.year, current.week);
  const offset = isoWeeksBetween({ year: config.start_year, week: config.start_week }, current);
  const result: ISOWeek[][] = Array.from({ length: config.cycle_length }, () => []);

  for (let index = 0; index < config.cycle_length * occurrences; index++) {
    const monday = new Date(currentMonday);
    monday.setUTCDate(monday.getUTCDate() + index * 7);
    const patternIndex =
      (((offset + index) % config.cycle_length) + config.cycle_length) % config.cycle_length;
    result[patternIndex]?.push(
      toISOWeek(monday.getUTCFullYear(), monday.getUTCMonth() + 1, monday.getUTCDate())
    );
  }

  return result;
}

/** "KW 42, 46, 50", with a short year only when the weeks span two years: "KW 50/26, 2/27". */
export function formatCalendarWeeks(weeks: ISOWeek[]): string {
  if (weeks.length === 0) return "";

  const sameYear = weeks.every((entry) => entry.year === weeks[0]?.year);
  const parts = weeks.map((entry) =>
    sameYear ? `${entry.week}` : `${entry.week}/${String(entry.year).slice(-2)}`
  );

  return `KW ${parts.join(", ")}`;
}
