import { describe, expect, it } from "vitest";
import type { FullRotationPattern } from "~/types/rotation";
import type { WeeklyShiftplanWithPattern } from "~/types/shiftplan";
import { assignmentsReplacedByFill, planShowsWeek } from "~/utils/plan-week";

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

function pattern(weeks: Record<number, Cells>): FullRotationPattern {
  return {
    config: { config_id: 1, cycle_length: 2, start_year: 2026, start_week: 1 },
    weeks: Object.entries(weeks).map(([week, cells]) => ({
      pattern_week: Number(week),
      assignments: Object.entries(cells).map(([shiftId, staffIds]) => ({
        shift: { shift_id: Number(shiftId) },
        staff: staffIds.map((staffId) => ({ staff_id: staffId })),
      })),
    })),
  } as unknown as FullRotationPattern;
}

describe("filling a week from the pattern", () => {
  const rotation = pattern({ 1: { 1: [5] }, 2: { 1: [7], 2: [8, 9] } });

  it("asks nothing for an empty week or one that already matches its pattern week", () => {
    expect(assignmentsReplacedByFill(plan({}), rotation)).toBe(0);
    expect(assignmentsReplacedByFill(plan({ 1: [7], 2: [9, 8] }), rotation)).toBe(0);
    expect(assignmentsReplacedByFill(null, rotation)).toBe(0);
  });

  it("counts every assignment that would be replaced once the week differs from the pattern", () => {
    expect(assignmentsReplacedByFill(plan({ 1: [7], 2: [8] }), rotation)).toBe(2);
    expect(assignmentsReplacedByFill(plan({ 1: [7], 2: [8, 9, 4] }), rotation)).toBe(4);
    expect(assignmentsReplacedByFill(plan({ 1: [8], 2: [7, 9] }), rotation)).toBe(3);
  });

  it("asks for any assigned week while the pattern is unknown", () => {
    expect(assignmentsReplacedByFill(plan({ 1: [7] }), null)).toBe(1);
    expect(assignmentsReplacedByFill(plan({ 1: [7] }, 9), rotation)).toBe(1);
  });
});

describe("loaded plan", () => {
  it("belongs to the selected week only when year and week match", () => {
    expect(planShowsWeek(plan({}), 2026, 43)).toBe(true);
    expect(planShowsWeek(plan({}), 2026, 44)).toBe(false);
    expect(planShowsWeek(null, 2026, 43)).toBe(false);
  });
});
