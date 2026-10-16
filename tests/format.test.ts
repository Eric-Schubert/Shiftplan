import { describe, expect, it } from "vitest";
import { formatDay, formatDayRange, formatWeekdays } from "~/shared/utils/format/day";
import { collator, formatNumber } from "~/shared/utils/format/number";
import { formatRelative, formatTimestamp } from "~/shared/utils/format/time";
import { formatWeekDates, weekLabel } from "~/shared/utils/format/week";

describe("formatDay", () => {
  it("writes a day in each style", () => {
    expect(formatDay("de", "2026-10-08")).toBe("Do. 08.10.");
    expect(formatDay("de", "2026-10-08", "weekday")).toBe("Do");
    expect(formatDay("de", "2026-10-08", "date")).toBe("08.10.");
    expect(formatDay("de", "2026-10-08", "intl")).toBe("Do., 08.10.");
    expect(formatDay("de-DE", "2026-10-11")).toBe("So. 11.10.");
  });

  it("handles the turn of the year and leaves invalid dates as they are", () => {
    expect(formatDay("de", "2025-12-31")).toBe("Mi. 31.12.");
    expect(formatDay("de", "2026-01-01")).toBe("Do. 01.01.");
    expect(formatDay("de", "2028-02-29")).toBe("Di. 29.02.");
    expect(formatDay("de", "2026-02-30")).toBe("2026-02-30");
    expect(formatDay("de", "")).toBe("");
  });
});

describe("formatDayRange", () => {
  it("writes one day once and a range across months and years", () => {
    expect(formatDayRange("de", "2026-10-08", "2026-10-08")).toBe("Do. 08.10.");
    expect(formatDayRange("de", "2026-09-28", "2026-10-04")).toBe("Mo. 28.09. – So. 04.10.");
    expect(formatDayRange("de", "2025-12-29", "2026-01-02")).toBe("Mo. 29.12. – Fr. 02.01.");
    expect(formatDayRange("de", "2026-09-28", "2026-10-04", "date")).toBe("28.09. – 04.10.");
  });
});

describe("formatWeekdays", () => {
  it("joins runs of three or more days", () => {
    const week = ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"];
    expect(formatWeekdays("de", week)).toBe("Mo–Fr");
    expect(formatWeekdays("de", ["2026-10-19", "2026-10-20"])).toBe("Mo, Di");
    expect(formatWeekdays("de", ["2026-10-19", "2026-10-21", "2026-10-22", "2026-10-23"])).toBe("Mo, Mi–Fr");
    expect(formatWeekdays("de", ["2026-10-23", "2026-10-19", "2026-10-19"])).toBe("Mo, Fr");
    expect(formatWeekdays("de", ["2026-12-31", "2027-01-01", "2027-01-02"])).toBe("Do–Sa");
    expect(formatWeekdays("de", [])).toBe("");
  });
});

describe("weeks", () => {
  it("labels calendar weeks with and without the year", () => {
    expect(weekLabel("de", 41)).toBe("KW 41");
    expect(weekLabel("de", 1, 2027)).toBe("KW 1/2027");
    expect(weekLabel("de-AT", 53, 2026)).toBe("KW 53/2026");
  });

  it("writes Monday to Sunday of an ISO week, also across the turn of the year", () => {
    expect(formatWeekDates("de", 2026, 41)).toBe("05.10. – 11.10.");
    expect(formatWeekDates("de", 2026, 1)).toBe("29.12. – 04.01.");
    expect(formatWeekDates("de", 2026, 53)).toBe("28.12. – 03.01.");
  });
});

describe("numbers and sorting", () => {
  it("formats numbers with optional fraction digits", () => {
    expect(formatNumber("de", 12345.6)).toBe("12.346");
    expect(formatNumber("de", 1234.56, 1)).toBe("1.234,6");
    expect(formatNumber("de", 3, 1)).toBe("3");
    expect(formatNumber("de", Number.NaN)).toBe("0");
  });

  it("sorts names the German way", () => {
    const names = ["Zoe", "Özil", "anna", "Ärger", "Bert", "Anna"];
    expect([...names].sort(collator("de").compare)).toEqual(["anna", "Anna", "Ärger", "Bert", "Özil", "Zoe"]);
    expect(collator("de")).toBe(collator("de"));
  });
});

describe("times", () => {
  it("writes a timestamp in a time zone, also across daylight saving time", () => {
    expect(formatTimestamp("de", Date.UTC(2026, 9, 8, 12, 30), "Europe/Berlin")).toBe("08.10.2026, 14:30");
    expect(formatTimestamp("de", new Date(Date.UTC(2026, 11, 31, 23, 5)), "Europe/Berlin")).toBe("01.01.2027, 00:05");
    expect(formatTimestamp("de", Number.NaN)).toBe("");
  });

  it("uses words next to now and numbers beyond", () => {
    expect(formatRelative("de", 0, "day")).toBe("heute");
    expect(formatRelative("de", -1, "day")).toBe("gestern");
    expect(formatRelative("de", 1, "day")).toBe("morgen");
    expect(formatRelative("de", -2, "day")).toBe("vor 2 Tagen");
    expect(formatRelative("de", -106, "day")).toBe("vor 106 Tagen");
  });
});
