import { describe, expect, it } from "vitest";
import type { WeeklyShiftplanWithPattern } from "~/types/shiftplan";
import { planShowsWeek } from "~/utils/plan-week";

type Cells = Record<number, number[]>;

function plan(cells: Cells, patternWeek = 2): WeeklyShiftplanWithPattern {
  return {
    week: { week_id: 1, year: 2026, week_number: 43 },
    pattern_week: patternWeek,
    shifts: Object.entries(cells).map(([shiftId, staffIds]) => ({
      shift_id: Number(shiftId),
      assigned_staff: staffIds.map((staffId) => ({ staff_id: staffId })),
    })),
  } as unknown as WeeklyShiftplanWithPattern;
}

describe("loaded plan", () => {
  it("belongs to the selected week only when year and week match", () => {
    expect(planShowsWeek(plan({}), 2026, 43)).toBe(true);
    expect(planShowsWeek(plan({}), 2026, 44)).toBe(false);
    expect(planShowsWeek(null, 2026, 43)).toBe(false);
  });
});
