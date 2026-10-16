import { parseISODate } from "./iso-date";

// ISO 8601 weeks: they start on Monday, and week 1 is the week with January 4.
// The math runs on UTC dates, so the time zone of the browser or server never shifts a day.

export type ISOWeek = { year: number; week: number };

const DAY_MS = 86400000;
const WEEK_MS = 7 * DAY_MS;

/** ISO week of a calendar date given as year, month (1-12) and day. */
export function toISOWeek(year: number, month: number, day: number): ISOWeek {
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
  return { year: date.getUTCFullYear(), week };
}

/** ISO week of the local calendar day of a Date, e.g. 2027-01-01 → week 53 of 2026. */
export function isoWeekOfDate(date: Date): ISOWeek {
  return toISOWeek(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** ISO week of a YYYY-MM-DD date that was already validated. */
export function weekOfDate(date: string): ISOWeek {
  const parsed = parseISODate(date)!;
  return toISOWeek(parsed.year, parsed.month, parsed.day);
}

/** 52 or 53. December 28 always lies in the last ISO week of its year. */
export function isoWeeksInYear(year: number): number {
  return toISOWeek(year, 12, 28).week;
}

/** Monday of an ISO week at 00:00 UTC. */
export function isoWeekMonday(year: number, week: number): Date {
  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const monday = new Date(januaryFourth);
  monday.setUTCDate(januaryFourth.getUTCDate() - (januaryFourth.getUTCDay() || 7) + 1 + (week - 1) * 7);
  return monday;
}

/** Monday to Sunday of an ISO week as YYYY-MM-DD strings. */
export function datesOfISOWeek(year: number, week: number): string[] {
  const monday = isoWeekMonday(year, week).getTime();
  return Array.from({ length: 7 }, (_, index) => new Date(monday + index * DAY_MS).toISOString().slice(0, 10));
}

/** Monday and Sunday of an ISO week as YYYY-MM-DD strings. */
export function isoWeekRange(year: number, week: number): { start: string; end: string } {
  const dates = datesOfISOWeek(year, week);
  return { start: dates[0]!, end: dates[6]! };
}

/** Whole weeks from one ISO week to another, negative when `to` lies before `from`. */
export function isoWeeksBetween(from: ISOWeek, to: ISOWeek): number {
  return Math.round((isoWeekMonday(to.year, to.week).getTime() - isoWeekMonday(from.year, from.week).getTime()) / WEEK_MS);
}
