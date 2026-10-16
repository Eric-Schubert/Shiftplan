import { isoWeekOfDate, isoWeeksInYear } from "~/shared/utils/week";

export type UpcomingWeek = { year: number; week: number };

/** The `count` weeks after the given one, across year boundaries. */
export function getUpcomingWeeks(year: number, week: number, count: number): UpcomingWeek[] {
  const weeks: UpcomingWeek[] = [];

  for (let i = 0; i < count; i++) {
    week++;
    if (week > isoWeeksInYear(year)) {
      week = 1;
      year++;
    }
    weeks.push({ year, week });
  }

  return weeks;
}

/** Today, or next Monday on Saturday and Sunday when the team does not work weekends. */
function plannerDate(nextWeekFromSaturday: boolean): Date {
  const date = new Date();
  const day = date.getDay();
  if (nextWeekFromSaturday && (day === 6 || day === 0)) {
    date.setDate(date.getDate() + (day === 6 ? 2 : 1));
  }
  return date;
}

export function getEffectiveCurrentWeek(nextWeekFromSaturday = true): number {
  return isoWeekOfDate(plannerDate(nextWeekFromSaturday)).week;
}

/** ISO week-numbering year: Monday 29.12.2025 already belongs to week 1 of 2026. */
export function getEffectiveCurrentYear(nextWeekFromSaturday = true): number {
  return isoWeekOfDate(plannerDate(nextWeekFromSaturday)).year;
}
