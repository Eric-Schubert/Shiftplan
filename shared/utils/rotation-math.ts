import { isoWeeksBetween, type ISOWeek } from "./week";

/**
 * Pattern week (1 to cycleLength) of a rotation that starts with pattern week 1 in `start`.
 * The cycle also repeats backwards, so weeks before the start get a pattern week too.
 */
export function patternWeekFor(cycleLength: number, start: ISOWeek, year: number, week: number): number {
  const weeksFromStart = isoWeeksBetween(start, { year, week });
  return (((weeksFromStart % cycleLength) + cycleLength) % cycleLength) + 1;
}
