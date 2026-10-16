import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { formatDay, formatWeekdays } from "~/shared/utils/format/day";
import { collator, formatNumber } from "~/shared/utils/format/number";
import { formatRelative, formatTimestamp } from "~/shared/utils/format/time";
import { formatWeekDates, weekLabel } from "~/shared/utils/format/week";
import { datesOfISOWeek, isoWeeksInYear } from "~/shared/utils/week";
import { formatHolidayPeriod } from "../utils/holiday";
import * as legacy from "./helpers/legacy-format";
import { getWeekDateRange } from "./helpers/legacy-week-math";

// shared/utils/format replaced hand-made German formatters. This compares it with frozen copies
// of the old code, so the German output stays byte-identical. The one deliberate change: the app
// now writes a weekday with a date like the server always did, „Do. 08.10.“ instead of „Do 08.10.“.
const ZONES = ["Europe/Berlin", "Pacific/Kiritimati", "America/Los_Angeles"];

function* days(firstYear = 2020, lastYear = 2030) {
  for (let day = new Date(Date.UTC(firstYear, 0, 1)); day.getUTCFullYear() <= lastYear; day.setUTCDate(day.getUTCDate() + 1)) {
    yield day.toISOString().slice(0, 10);
  }
}

function* weeks(firstYear = 2020, lastYear = 2030) {
  for (let year = firstYear; year <= lastYear; year++) {
    for (let week = 1; week <= isoWeeksInYear(year); week++) yield { year, week };
  }
}

describe.each(ZONES)("formatters match the old German output in %s", (zone) => {
  const originalZone = process.env.TZ;
  beforeAll(() => void (process.env.TZ = zone));
  afterAll(() => {
    if (originalZone === undefined) delete process.env.TZ;
    else process.env.TZ = originalZone;
  });

  it("writes days like the server and the app's weekday and date labels", () => {
    for (const date of days()) {
      expect(formatDay("de", date)).toBe(legacy.formatNoticeDay(date));
      expect(formatDay("de", date)).toBe(legacy.formatAbsenceDay(date).replace(" ", ". "));
      expect(formatDay("de", date, "weekday")).toBe(legacy.formatAbsenceDay(date, false));
      expect(formatDay("de", date, "date")).toBe(legacy.formatAbsenceDay(date).split(" ")[1]);
      expect(formatDay("de", date, "date")).toBe(legacy.analytics.formatDate(date));
      expect(formatDay("de", date, "intl")).toBe(legacy.analytics.formatLongDate(date));
    }
  });

  it("writes weeks, week dates and weekday runs", () => {
    for (const { year, week } of weeks()) {
      expect(formatWeekDates("de", year, week)).toBe(legacy.formatWeekDateRange(getWeekDateRange(week, year)));
      expect(weekLabel("de", week, year)).toBe(`KW ${week}/${year}`);
    }
    const week = datesOfISOWeek(2026, 41);
    for (let subset = 0; subset < 128; subset++) {
      const dates = week.filter((_, index) => subset & (1 << index));
      expect(formatWeekdays("de", dates)).toBe(legacy.formatWeekdays(dates));
    }
  });

  it("writes timestamps hour by hour through a year with two clock changes", () => {
    for (let time = Date.UTC(2026, 0, 1); time < Date.UTC(2027, 0, 1); time += 3600000 + 60000) {
      expect(formatTimestamp("de", time)).toBe(legacy.formatTimestamp(time));
      const sql = new Date(time).toISOString().slice(0, 19).replace("T", " ");
      expect(formatTimestamp("de-DE", new Date(`${sql}Z`), "Europe/Berlin")).toBe(legacy.formatMessageDate(sql, "Europe/Berlin"));
    }
  });
});

describe("formatters without a time zone dependency", () => {
  // West of UTC the old holiday code showed the day before; the new code does not.
  it("write holiday dates as before east of UTC", () => {
    const originalZone = process.env.TZ;
    process.env.TZ = "Europe/Berlin";
    try {
      for (const date of days(2025, 2027)) {
        expect(formatDay("de", date, "intl")).toBe(legacy.formatHolidayDate(date));
        expect(formatHolidayPeriod("de", date, date)).toBe(legacy.formatHolidayPeriod(date, date));
      }
    } finally {
      if (originalZone === undefined) delete process.env.TZ;
      else process.env.TZ = originalZone;
    }
  });

  it("write numbers, relative days and sort names as before", () => {
    for (const value of [0, 1, 7.5, 999.95, 1000, 12345.678, -42.25, Number.NaN]) {
      expect(formatNumber("de", value)).toBe(legacy.analytics.formatNumber(value));
      expect(formatNumber("de", value, 1)).toBe(legacy.analytics.formatAverage(value));
    }
    for (let diff = 0; diff <= 400; diff++) expect(formatRelative("de", -diff, "day")).toBe(legacy.formatRelativeDays(diff));

    const names = ["Zoe", "Özil", "anna", "Ärger", "Bert", "Anna", "Ölbaum", "Oliver", "Müller", "Mueller", "Straße", "Strasse"];
    expect([...names].sort(collator("de").compare)).toEqual([...names].sort((a, b) => a.localeCompare(b, "de")));
  });
});
