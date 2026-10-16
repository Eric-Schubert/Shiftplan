import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicHoliday, SchoolHolidayPeriod } from "~/types/holiday";
import { holidayWeekEntry, loadHolidayWeek } from "~/composables/useHolidayWeek";

const holiday: PublicHoliday = { date: "2031-02-03", name: "Sample day", type: "national", nationwide: true, states: [] };
const winter: SchoolHolidayPeriod = { name: "Winter", start: "2031-02-03", end: "2031-02-08", states: [] };

function holidayApi(school: SchoolHolidayPeriod[] | Error) {
  return vi.fn(async (url: string) => {
    if (url.endsWith("/public")) return [holiday];
    if (school instanceof Error) throw school;
    return { grouped: school };
  });
}

describe("holiday week in the browser", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps the public holidays when only the school holidays fail, and completes them on the next load", async () => {
    vi.stubGlobal("$fetch", holidayApi(new Error("502 upstream")));
    await loadHolidayWeek(2031, 6);
    const entry = holidayWeekEntry("2031-6", false);
    expect(entry.holidays).toEqual([holiday]);
    expect(entry.schoolHolidays).toEqual([]);
    expect(entry.error).toBe("502 upstream");
    expect(entry.loaded).toBe(false);
    expect(entry.loading).toBe(false);

    vi.stubGlobal("$fetch", holidayApi([winter]));
    await loadHolidayWeek(2031, 6);
    expect(entry.holidays).toEqual([holiday]);
    expect(entry.schoolHolidays).toEqual([winter]);
    expect(entry.error).toBeNull();
    expect(entry.loaded).toBe(true);
  });
});
