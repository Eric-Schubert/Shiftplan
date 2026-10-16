import { describe, expect, it } from "vitest";
import { formatDay, formatDayRange, formatWeekdays } from "~/shared/utils/format/day";
import { collator, formatNumber } from "~/shared/utils/format/number";
import { formatRelative, formatTimestamp } from "~/shared/utils/format/time";
import { formatWeekDates, weekLabel, weekOfYearLabel } from "~/shared/utils/format/week";
import { buildPrimeLocale } from "~/utils/primevue-locale";
import en from "~/i18n/locales/en";

// British English: day before month, 24-hour times, weeks in words.
const TAG = "en-GB";

describe("English formatters", () => {
  it("write days, ranges and weekday runs", () => {
    expect(formatDay(TAG, "2026-10-08")).toBe("Thu 08/10");
    expect(formatDay(TAG, "2026-10-08", "weekday")).toBe("Thu");
    expect(formatDay(TAG, "2026-10-08", "date")).toBe("08/10");
    expect(formatDay(TAG, "2026-10-08", "intl")).toBe("Thu 08/10");
    expect(formatDay(TAG, "2026-02-30")).toBe("2026-02-30");
    expect(formatDayRange(TAG, "2025-12-29", "2026-01-02")).toBe("Mon 29/12 – Fri 02/01");
    expect(formatDayRange(TAG, "2026-09-28", "2026-10-04", "date")).toBe("28/09 – 04/10");
    expect(formatWeekdays(TAG, ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"])).toBe("Mon–Fri");
    expect(formatWeekdays(TAG, ["2026-10-19", "2026-10-21", "2026-10-22", "2026-10-23"])).toBe("Mon, Wed–Fri");
  });

  it("name weeks in words, also for English tags without their own row", () => {
    expect(weekLabel(TAG, 41)).toBe("Week 41");
    expect(weekLabel(TAG, "43, 45")).toBe("Week 43, 45");
    expect(weekOfYearLabel(TAG, 2027, 1)).toBe("Week 1/2027");
    expect(weekLabel("en-US", 41)).toBe("Week 41");
    expect(formatDay("en-US", "2026-10-08")).toBe("Thu 08/10");
    expect(formatWeekDates(TAG, 2026, 53)).toBe("28/12 – 03/01");
  });

  it("write numbers, sort names and keep 24-hour times", () => {
    expect(formatNumber(TAG, 12345.6)).toBe("12,346");
    expect(formatNumber(TAG, 1234.56, 1)).toBe("1,234.6");
    expect(["Zoe", "Özil", "anna", "Bert"].sort(collator(TAG).compare)).toEqual(["anna", "Bert", "Özil", "Zoe"]);
    expect(formatTimestamp(TAG, Date.UTC(2026, 9, 8, 12, 30), "Europe/Berlin")).toBe("08/10/2026, 14:30");
    expect(formatTimestamp(TAG, Date.UTC(2026, 11, 31, 23, 5), "Europe/London")).toBe("31/12/2026, 23:05");
  });

  it("use words next to now and numbers beyond", () => {
    expect(formatRelative(TAG, 0, "day")).toBe("today");
    expect(formatRelative(TAG, -1, "day")).toBe("yesterday");
    expect(formatRelative(TAG, 1, "day")).toBe("tomorrow");
    expect(formatRelative(TAG, -2, "day")).toBe("2 days ago");
  });

  it("give PrimeVue English names with the week starting on Monday", () => {
    const locale = buildPrimeLocale(TAG, en.primevue);
    expect(locale.firstDayOfWeek).toBe(1);
    expect(locale.dayNamesShort).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
    expect(locale.monthNames[9]).toBe("October");
    expect(locale.fileSizeTypes).toEqual(en.primevue.fileSizeTypes);
  });
});
