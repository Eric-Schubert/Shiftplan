export function getIsoWeekStartDate(year: number, week: number): Date {
  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = januaryFourth.getUTCDay() || 7;
  const firstIsoWeekMonday = new Date(januaryFourth);

  firstIsoWeekMonday.setUTCDate(januaryFourth.getUTCDate() - dayOfWeek + 1);
  firstIsoWeekMonday.setUTCDate(firstIsoWeekMonday.getUTCDate() + (week - 1) * 7);

  return firstIsoWeekMonday;
}

export function getIsoWeeksBetween(
  startYear: number,
  startWeek: number,
  endYear: number,
  endWeek: number
): number {
  const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000;
  const startDate = getIsoWeekStartDate(startYear, startWeek);
  const endDate = getIsoWeekStartDate(endYear, endWeek);

  return Math.round((endDate.getTime() - startDate.getTime()) / millisecondsPerWeek);
}

export function getIsoWeeksInYear(year: number): number {
  const decemberTwentyEighth = new Date(Date.UTC(year, 11, 28));
  const dayOfWeek = decemberTwentyEighth.getUTCDay() || 7;

  decemberTwentyEighth.setUTCDate(decemberTwentyEighth.getUTCDate() + 4 - dayOfWeek);

  const yearStart = new Date(Date.UTC(decemberTwentyEighth.getUTCFullYear(), 0, 1));
  return Math.ceil(((decemberTwentyEighth.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function getPatternWeekForCalendarWeek(
  cycleLength: number,
  startYear: number,
  startWeek: number,
  year: number,
  week: number
): number {
  const weeksFromStart = getIsoWeeksBetween(startYear, startWeek, year, week);
  const patternIndex = ((weeksFromStart % cycleLength) + cycleLength) % cycleLength;

  return patternIndex + 1;
}
