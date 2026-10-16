import { afterEach, describe, expect, it, vi } from "vitest";
import { getEffectiveCurrentWeek, getEffectiveCurrentYear } from "../stores/app/week";

function at(date: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${date}T10:00:00`));
}

function current(nextWeekFromSaturday: boolean) {
  return { year: getEffectiveCurrentYear(nextWeekFromSaturday), week: getEffectiveCurrentWeek(nextWeekFromSaturday) };
}

describe("planner current week", () => {
  afterEach(() => vi.useRealTimers());

  it("keeps the running week on weekdays", () => {
    at("2026-10-09"); // Friday, week 41
    expect(current(true)).toEqual({ year: 2026, week: 41 });
    expect(current(false)).toEqual({ year: 2026, week: 41 });
  });

  it.each(["2026-10-10", "2026-10-11"])("opens next week on %s unless the team works weekends", (date) => {
    at(date);
    expect(current(true)).toEqual({ year: 2026, week: 42 });
    expect(current(false)).toEqual({ year: 2026, week: 41 });
  });

  it("follows ISO years across the turn of the year", () => {
    at("2027-01-02"); // Saturday of week 53/2026
    expect(current(true)).toEqual({ year: 2027, week: 1 });
    expect(current(false)).toEqual({ year: 2026, week: 53 });

    at("2025-12-29"); // Monday of week 1/2026
    expect(current(false)).toEqual({ year: 2026, week: 1 });
  });
});
