import { getConfig } from "~/server/services/rotation/config";

export function getISOWeekStartDate(year: number, week: number): Date {
  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = januaryFourth.getUTCDay() || 7;
  const firstIsoWeekMonday = new Date(januaryFourth);

  firstIsoWeekMonday.setUTCDate(januaryFourth.getUTCDate() - dayOfWeek + 1);
  firstIsoWeekMonday.setUTCDate(firstIsoWeekMonday.getUTCDate() + (week - 1) * 7);

  return firstIsoWeekMonday;
}

export function weeksBetween(
  startYear: number,
  startWeek: number,
  endYear: number,
  endWeek: number
): number {
  const startDate = getISOWeekStartDate(startYear, startWeek);
  const endDate = getISOWeekStartDate(endYear, endWeek);
  const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000;

  return Math.round((endDate.getTime() - startDate.getTime()) / millisecondsPerWeek);
}

export function calculatePatternWeek(year: number, weekNumber: number): number {
  const config = getConfig();
  const weeksFromStart = weeksBetween(
    config.start_year,
    config.start_week,
    year,
    weekNumber
  );
  const patternIndex = ((weeksFromStart % config.cycle_length) + config.cycle_length) % config.cycle_length;

  return patternIndex + 1;
}
