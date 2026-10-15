import { getISOWeekStartDate, weeksBetween } from "~/server/services/rotation/weeks";
import { toISOWeek } from "~/server/utils/iso-week";
import type { RotationConfig } from "~/types/rotation";

export type IsoWeek = { year: number; week: number };

export function currentIsoWeek(today = new Date()): IsoWeek {
  return toISOWeek(today.getFullYear(), today.getMonth() + 1, today.getDate());
}

/** The next calendar weeks (from this week on) for every pattern week, index 0 = pattern week 1. */
export function upcomingCalendarWeeks(
  config: Pick<RotationConfig, "cycle_length" | "start_year" | "start_week">,
  occurrences: number,
  today = new Date()
): IsoWeek[][] {
  const current = currentIsoWeek(today);
  const currentMonday = getISOWeekStartDate(current.year, current.week);
  const offset = weeksBetween(config.start_year, config.start_week, current.year, current.week);
  const result: IsoWeek[][] = Array.from({ length: config.cycle_length }, () => []);

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
export function formatCalendarWeeks(weeks: IsoWeek[]): string {
  if (weeks.length === 0) return "";

  const sameYear = weeks.every((entry) => entry.year === weeks[0]?.year);
  const parts = weeks.map((entry) =>
    sameYear ? `${entry.week}` : `${entry.week}/${String(entry.year).slice(-2)}`
  );

  return `KW ${parts.join(", ")}`;
}
