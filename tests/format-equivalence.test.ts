import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { datesOfISOWeek, isoWeeksInYear } from "~/shared/utils/week";
import * as legacy from "./helpers/legacy-format";
import { getWeekDateRange } from "./helpers/legacy-week-math";

// shared/utils/format replaced hand-made German formatters. This compares it with frozen copies
// of the old code, so the German output stays byte-identical. The one deliberate change: the app
// now writes a weekday with a date like the server always did, „Do. 08.10.“ instead of „Do 08.10.“.
const ZONES = ["Europe/Berlin", "Pacific/Kiritimati", "America/Los_Angeles"];
const DE = "de-DE";

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

// Fresh modules per zone: a cached Intl object keeps the zone it was created in.
async function formatters() {
  vi.resetModules();
  return {
    ...(await import("~/shared/utils/format/day")),
    ...(await import("~/shared/utils/format/number")),
    ...(await import("~/shared/utils/format/time")),
    ...(await import("~/shared/utils/format/week")),
    ...(await import("../utils/holiday")),
  };
}

function inZone(zone: string) {
  const originalZone = process.env.TZ;
  beforeAll(() => void (process.env.TZ = zone));
  afterAll(() => {
    if (originalZone === undefined) delete process.env.TZ;
    else process.env.TZ = originalZone;
  });
}

describe.each(ZONES)("formatters match the old German output in %s", (zone) => {
  inZone(zone);
  let format: Awaited<ReturnType<typeof formatters>>;
  beforeAll(async () => void (format = await formatters()));

  it("writes days like the server and the app's weekday and date labels", () => {
    for (const date of days()) {
      expect(format.formatDay(DE, date)).toBe(legacy.formatNoticeDay(date));
      expect(format.formatDay(DE, date)).toBe(legacy.formatAbsenceDay(date).replace(" ", ". "));
      expect(format.formatDay(DE, date, "weekday")).toBe(legacy.formatAbsenceDay(date, false));
      expect(format.formatDay(DE, date, "date")).toBe(legacy.formatAbsenceDay(date).split(" ")[1]);
      expect(format.formatDay(DE, date, "date")).toBe(legacy.analytics.formatDate(date));
      expect(format.formatDay(DE, date, "intl")).toBe(legacy.analytics.formatLongDate(date));
    }
  });

  it("writes day ranges like the server", () => {
    const all = [...days(2025, 2027)];
    for (const [index, from] of all.entries()) {
      for (const to of [from, all[index + 1], all[index + 40]].filter((date): date is string => !!date)) {
        const old = from === to ? legacy.formatNoticeDay(from) : `${legacy.formatNoticeDay(from)} – ${legacy.formatNoticeDay(to)}`;
        expect(format.formatDayRange(DE, from, to)).toBe(old);
      }
    }
  });

  it("writes weeks, week dates and weekday runs", () => {
    for (const { year, week } of weeks()) {
      expect(format.formatWeekDates(DE, year, week)).toBe(legacy.formatWeekDateRange(getWeekDateRange(week, year)));
      expect(format.weekLabel(DE, week)).toBe(`KW ${week}`);
      expect(format.weekOfYearLabel(DE, year, week)).toBe(`KW ${week}/${year}`);
    }
    const week = datesOfISOWeek(2026, 41);
    for (let subset = 0; subset < 128; subset++) {
      const dates = week.filter((_, index) => subset & (1 << index));
      expect(format.formatWeekdays(DE, dates)).toBe(legacy.formatWeekdays(dates));
    }
  });

  it("writes timestamps hour by hour through a year with two clock changes", () => {
    for (let time = Date.UTC(2026, 0, 1); time < Date.UTC(2027, 0, 1); time += 3600000 + 60000) {
      expect(format.formatTimestamp(DE, time)).toBe(legacy.formatTimestamp(time));
      const sql = new Date(time).toISOString().slice(0, 19).replace("T", " ");
      expect(format.formatTimestamp(DE, new Date(`${sql}Z`), "Europe/Berlin")).toBe(legacy.formatMessageDate(sql, "Europe/Berlin"));
    }
  });
});

describe("formatters without a time zone dependency", () => {
  // West of UTC the old holiday code showed the day before; the new code does not.
  describe("east of UTC", () => {
    inZone("Europe/Berlin");
    it("write holiday dates as before", async () => {
      const format = await formatters();
      for (const date of days(2025, 2027)) {
        expect(format.formatDay(DE, date, "intl")).toBe(legacy.formatHolidayDate(date));
        expect(format.formatHolidayPeriod(DE, date, date)).toBe(legacy.formatHolidayPeriod(date, date));
      }
    });
  });

  it("write numbers, relative days and sort names as before", async () => {
    const format = await formatters();
    for (const value of [0, 1, 7.5, 999.95, 1000, 12345.678, -42.25, Number.NaN]) {
      expect(format.formatNumber(DE, value)).toBe(legacy.analytics.formatNumber(value));
      expect(format.formatNumber(DE, value, 1)).toBe(legacy.analytics.formatAverage(value));
    }
    for (let diff = 0; diff <= 400; diff++) expect(format.formatRelative(DE, -diff, "day")).toBe(legacy.formatRelativeDays(diff));

    const names = ["Zoe", "Özil", "anna", "Ärger", "Bert", "Anna", "Ölbaum", "Oliver", "Müller", "Mueller", "Straße", "Strasse"];
    expect([...names].sort(format.collator(DE).compare)).toEqual([...names].sort((a, b) => a.localeCompare(b, "de")));
  });
});
