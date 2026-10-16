// Frozen copies of the week math that shared/utils/week.ts and shared/utils/rotation-math.ts
// replaced (master 139d264). Only tests/week-math-equivalence.test.ts uses them. Copies that
// were character for character the same appear once, with every file they lived in.

/** server/utils/iso-week.ts `toISOWeek` */
export function toISOWeek(year: number, month: number, day: number): { year: number; week: number } {
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: date.getUTCFullYear(), week };
}

/** server/utils/iso-week.ts `datesOfISOWeek`, utils/week-dates.ts `weekDates` */
export function datesOfISOWeek(year: number, week: number): string[] {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1) + (week - 1) * 7);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setUTCDate(monday.getUTCDate() + index);
    return day.toISOString().slice(0, 10);
  });
}

/** stores/app/week.ts, server/services/shiftplan/generation.ts and server/api/shiftplan/index.get.ts `getISOWeek` */
export function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** stores/app/week.ts `getISOWeekYear` */
export function getISOWeekYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  return d.getUTCFullYear();
}

/** utils/rotation.ts `getIsoWeekOfDate` */
export function getIsoWeekOfDate(date: Date): { year: number; week: number } {
  const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((day.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: day.getUTCFullYear(), week };
}

/** stores/app/week.ts and server/services/shiftplan/generation.ts `getISOWeeksInYear` */
export function getISOWeeksInYear(year: number): number {
  const d = new Date(year, 11, 31);
  const week = getISOWeek(d);
  return week === 1 ? 52 : week;
}

/** utils/rotation.ts `getIsoWeeksInYear` */
export function getIsoWeeksInYear(year: number): number {
  const decemberTwentyEighth = new Date(Date.UTC(year, 11, 28));
  const dayOfWeek = decemberTwentyEighth.getUTCDay() || 7;

  decemberTwentyEighth.setUTCDate(decemberTwentyEighth.getUTCDate() + 4 - dayOfWeek);

  const yearStart = new Date(Date.UTC(decemberTwentyEighth.getUTCFullYear(), 0, 1));
  return Math.ceil(((decemberTwentyEighth.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** server/services/rotation/weeks.ts `getISOWeekStartDate`, utils/rotation.ts `getIsoWeekStartDate` */
export function getISOWeekStartDate(year: number, week: number): Date {
  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = januaryFourth.getUTCDay() || 7;
  const firstIsoWeekMonday = new Date(januaryFourth);

  firstIsoWeekMonday.setUTCDate(januaryFourth.getUTCDate() - dayOfWeek + 1);
  firstIsoWeekMonday.setUTCDate(firstIsoWeekMonday.getUTCDate() + (week - 1) * 7);

  return firstIsoWeekMonday;
}

/** server/services/rotation/weeks.ts `weeksBetween`, utils/rotation.ts `getIsoWeeksBetween` */
export function weeksBetween(startYear: number, startWeek: number, endYear: number, endWeek: number): number {
  const startDate = getISOWeekStartDate(startYear, startWeek);
  const endDate = getISOWeekStartDate(endYear, endWeek);
  const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000;

  return Math.round((endDate.getTime() - startDate.getTime()) / millisecondsPerWeek);
}

/** utils/rotation.ts `getPatternWeekForCalendarWeek`, server/services/rotation/weeks.ts `calculatePatternWeek` with the config inlined */
export function getPatternWeekForCalendarWeek(cycleLength: number, startYear: number, startWeek: number, year: number, week: number): number {
  const weeksFromStart = weeksBetween(startYear, startWeek, year, week);
  const patternIndex = ((weeksFromStart % cycleLength) + cycleLength) % cycleLength;

  return patternIndex + 1;
}

/** stores/app/week.ts `getDateOfISOWeek` (local time) */
export function getDateOfISOWeek(week: number, year: number): Date {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }
  return ISOweekStart;
}

/** stores/app/week.ts `getWeekDateRange` (local time) */
export function getWeekDateRange(week: number, year: number): { start: Date; end: Date } {
  const start = getDateOfISOWeek(week, year);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}
