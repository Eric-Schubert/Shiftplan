import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { patternWeekFor } from "~/shared/utils/rotation-math";
import {
  datesOfISOWeek,
  isoWeekMonday,
  isoWeekOfDate,
  isoWeekRange,
  isoWeeksBetween,
  isoWeeksInYear,
  toISOWeek,
  weekOfDate,
} from "~/shared/utils/week";
import { getWeekDateRange } from "../stores/app/week";
import * as legacy from "./helpers/legacy-week-math";

// The shared week math replaced seven copies. This compares it with frozen copies of the old
// code for every day and week from 2000 to 2100, in time zones east and west of UTC.
const FIRST_YEAR = 2000;
const LAST_YEAR = 2100;
const ZONES = ["Europe/Berlin", "Pacific/Kiritimati", "America/Los_Angeles"];
const STARTS = [
  { year: 2000, week: 1 },
  { year: 2020, week: 53 },
  { year: 2026, week: 18 },
  { year: 2099, week: 52 },
];

function* days() {
  for (let day = new Date(Date.UTC(FIRST_YEAR, 0, 1)); day.getUTCFullYear() <= LAST_YEAR; day.setUTCDate(day.getUTCDate() + 1)) {
    yield { year: day.getUTCFullYear(), month: day.getUTCMonth() + 1, day: day.getUTCDate(), iso: day.toISOString().slice(0, 10) };
  }
}

// Week 53 of a 52-week year is invalid input, but the old code accepted it, so it is compared too.
function* weeks() {
  for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
    for (let week = 1; week <= 53; week++) yield { year, week };
  }
}

// Counts mismatches instead of asserting per item, so a failure reports one number, not thousands.
function mismatches<T>(items: Iterable<T>, same: (item: T) => boolean): T[] {
  const found: T[] = [];
  for (const item of items) if (!same(item)) found.push(item);
  return found;
}

describe.each(ZONES)("shared week math matches the old copies in %s", (zone) => {
  const originalZone = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = zone;
  });
  afterAll(() => {
    if (originalZone === undefined) delete process.env.TZ;
    else process.env.TZ = originalZone;
  });

  it("runs in the requested time zone", () => {
    const offsets = { "Europe/Berlin": -60, "Pacific/Kiritimati": -840, "America/Los_Angeles": 480 };
    expect(new Date(2026, 0, 15).getTimezoneOffset()).toBe(offsets[zone as keyof typeof offsets]);
  });

  it("finds the same ISO week for every calendar day", () => {
    const wrong = mismatches(days(), ({ year, month, day, iso }) => {
      const expected = legacy.toISOWeek(year, month, day);
      const midnight = new Date(year, month - 1, day);
      const lateEvening = new Date(year, month - 1, day, 23, 59);
      return [toISOWeek(year, month, day), weekOfDate(iso), isoWeekOfDate(midnight), isoWeekOfDate(lateEvening)].every(
        (week) =>
          week.year === expected.year &&
          week.week === expected.week &&
          week.week === legacy.getISOWeek(lateEvening) &&
          week.year === legacy.getISOWeekYear(lateEvening) &&
          week.week === legacy.getIsoWeekOfDate(midnight).week &&
          week.year === legacy.getIsoWeekOfDate(midnight).year
      );
    });
    expect(wrong).toEqual([]);
  });

  it("counts the same weeks per year", () => {
    const years = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, index) => FIRST_YEAR + index);
    expect(mismatches(years, (year) => isoWeeksInYear(year) === legacy.getISOWeeksInYear(year))).toEqual([]);
    expect(mismatches(years, (year) => isoWeeksInYear(year) === legacy.getIsoWeeksInYear(year))).toEqual([]);
  });

  it("finds the same Monday, dates and range for every week", () => {
    const wrong = mismatches(weeks(), ({ year, week }) => {
      const dates = legacy.datesOfISOWeek(year, week);
      const local = legacy.getWeekDateRange(week, year);
      const range = getWeekDateRange(week, year);
      return (
        isoWeekMonday(year, week).getTime() === legacy.getISOWeekStartDate(year, week).getTime() &&
        datesOfISOWeek(year, week).join() === dates.join() &&
        isoWeekRange(year, week).start === dates[0] &&
        isoWeekRange(year, week).end === dates[6] &&
        range.start.getTime() === local.start.getTime() &&
        range.end.getTime() === local.end.getTime()
      );
    });
    expect(wrong).toEqual([]);
  });

  it("finds the same distance and pattern week from rotation starts", () => {
    const valid = [...weeks()].filter(({ year, week }) => week <= isoWeeksInYear(year));
    const wrong = mismatches(valid, ({ year, week }) =>
      STARTS.every((start) => {
        if (isoWeeksBetween(start, { year, week }) !== legacy.weeksBetween(start.year, start.week, year, week)) return false;
        return [1, 2, 3, 4, 5, 6, 7, 8].every(
          (cycle) => patternWeekFor(cycle, start, year, week) === legacy.getPatternWeekForCalendarWeek(cycle, start.year, start.week, year, week)
        );
      })
    );
    expect(wrong).toEqual([]);
  });
});
