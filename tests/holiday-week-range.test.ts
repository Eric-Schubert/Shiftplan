import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ISO week, its Monday and Sunday; 2026 starts on a Thursday and has 53 weeks.
const WEEKS = [
  { label: "normal week", year: 2026, week: 20, monday: "2026-05-11", sunday: "2026-05-17" },
  { label: "spring DST switch", year: 2026, week: 13, monday: "2026-03-23", sunday: "2026-03-29" },
  { label: "autumn DST switch", year: 2026, week: 43, monday: "2026-10-19", sunday: "2026-10-25" },
  { label: "week after autumn DST", year: 2026, week: 44, monday: "2026-10-26", sunday: "2026-11-01" },
  { label: "week 1 starting in December", year: 2026, week: 1, monday: "2025-12-29", sunday: "2026-01-04" },
  { label: "week 53", year: 2026, week: 53, monday: "2026-12-28", sunday: "2027-01-03" },
  { label: "week 1 of a Monday year", year: 2024, week: 1, monday: "2024-01-01", sunday: "2024-01-07" },
];

const TIME_ZONES = [
  { tz: "Europe/Berlin", winterOffset: -60, summerOffset: -120 },
  { tz: "UTC", winterOffset: 0, summerOffset: 0 },
];

function shiftDate(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function publicHoliday(date: string) {
  return { id: date, startDate: date, endDate: date, type: "Public", name: [{ language: "DE", text: date }], nationwide: true };
}

function schoolHoliday(name: string, start: string, end: string) {
  return { id: name, startDate: start, endDate: end, type: "School", name: [{ language: "DE", text: name }] };
}

let apiData: Record<"PublicHolidays" | "SchoolHolidays", Array<{ startDate: string }>>;
let requests: URL[];

function stubOpenHolidaysApi() {
  requests = [];
  vi.stubGlobal("fetch", vi.fn(async (input: string) => {
    const url = new URL(input);
    requests.push(url);
    const from = url.searchParams.get("validFrom")!;
    const to = url.searchParams.get("validTo")!;
    const kind = url.pathname.endsWith("SchoolHolidays") ? "SchoolHolidays" : "PublicHolidays";
    const body = apiData[kind].filter((entry) => entry.startDate >= from && entry.startDate <= to);
    return new Response(JSON.stringify(body), { status: 200 });
  }));
}

describe.each(TIME_ZONES)("holiday week range with TZ=$tz", ({ tz, winterOffset, summerOffset }) => {
  beforeEach(() => {
    vi.stubEnv("TZ", tz);
    vi.resetModules();
    stubOpenHolidaysApi();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("runs in the requested time zone", () => {
    expect(new Date(2026, 0, 1).getTimezoneOffset()).toBe(winterOffset);
    expect(new Date(2026, 6, 1).getTimezoneOffset()).toBe(summerOffset);
  });

  it.each(WEEKS)("getWeekDateRange covers Monday to Sunday ($label)", async ({ year, week, monday, sunday }) => {
    const { getWeekDateRange } = await import("~/server/lib/holidays/open-holidays");
    expect(getWeekDateRange(year, week)).toEqual({ start: monday, end: sunday });
  });

  it.each(WEEKS)("public holidays on Monday and Sunday stay in their week ($label)", async ({ year, week, monday, sunday }) => {
    const dates = [shiftDate(monday, -1), monday, sunday, shiftDate(sunday, 1)];
    apiData = { PublicHolidays: dates.map(publicHoliday), SchoolHolidays: [] };
    const { PublicHolidayService } = await import("~/server/services/public-holiday.service");

    const result = await PublicHolidayService.list(year, week);

    expect(result.map((holiday) => holiday.date)).toEqual([monday, sunday]);
    expect(requests.map((url) => [url.searchParams.get("validFrom"), url.searchParams.get("validTo")])).toEqual([
      [`${year}-01-01`, `${year}-12-31`],
      [`${year - 1}-01-01`, `${year - 1}-12-31`],
      [`${year + 1}-01-01`, `${year + 1}-12-31`],
    ]);
  });

  it.each(WEEKS)("school holidays touching Monday or Sunday stay in their week ($label)", async ({ year, week, monday, sunday }) => {
    apiData = {
      PublicHolidays: [],
      SchoolHolidays: [
        schoolHoliday("endsBefore", shiftDate(monday, -7), shiftDate(monday, -1)),
        schoolHoliday("endsMonday", shiftDate(monday, -7), monday),
        schoolHoliday("startsSunday", sunday, shiftDate(sunday, 7)),
        schoolHoliday("startsAfter", shiftDate(sunday, 1), shiftDate(sunday, 7)),
      ],
    };
    const { SchoolHolidayService } = await import("~/server/services/school-holiday.service");

    const { holidays } = await SchoolHolidayService.list(year, week, ["SN"]);

    expect(holidays.map((holiday) => holiday.name)).toEqual(["endsMonday", "startsSunday"]);
    expect(requests).toHaveLength(1);
    expect(requests[0]!.searchParams.get("subdivisionCode")).toBe("DE-SN");
    expect(requests[0]!.searchParams.get("validFrom")).toBe(`${year - 1}-07-01`);
    expect(requests[0]!.searchParams.get("validTo")).toBe(`${year + 1}-06-30`);
  });
});
