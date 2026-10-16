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
  // The plans above are for week 43/2026.
  const week43 = { year: 2026, week: 43, loading: false };
  const replaced = (cells: Cells | null, rules: FullRotationPattern | null = rotation, target = week43) =>
    assignmentsReplacedByFill(cells && plan(cells), rules, target);

  it("asks nothing for an empty week or one that already matches its pattern week", () => {
    expect(replaced({})).toBe(0);
    expect(replaced({ 1: [7], 2: [9, 8] })).toBe(0);
  });

  it("counts every assignment that would be replaced once the week differs from the pattern", () => {
    expect(replaced({ 1: [7], 2: [8] })).toBe(2);
    expect(replaced({ 1: [7], 2: [8, 9, 4] })).toBe(4);
    expect(replaced({ 1: [8], 2: [7, 9] })).toBe(3);
  });

  it("asks for any assigned week while the pattern is unknown", () => {
    expect(replaced({ 1: [7] }, null)).toBe(1);
    expect(assignmentsReplacedByFill(plan({ 1: [7] }, 9), rotation, week43)).toBe(1);
  });

  it("knows nothing about a week whose plan has not arrived: still the previous week's, or reloading", () => {
    // Switched from the empty week 43 to week 44, which holds manual work, and clicked at once.
    expect(replaced({}, rotation, { year: 2026, week: 44, loading: true })).toBeNull();
    expect(replaced({}, rotation, { year: 2026, week: 44, loading: false })).toBeNull();
    // A reload after a change still shows the plan from before it.
    expect(replaced({ 1: [7], 2: [9, 8] }, rotation, { ...week43, loading: true })).toBeNull();
  });

  it("knows nothing about a week whose plan failed to load", () => {
    expect(replaced(null)).toBeNull();
    expect(replaced(null, null)).toBeNull();
  });
});

describe("loaded plan", () => {
  it("belongs to the selected week only when year and week match", () => {
    expect(planShowsWeek(plan({}), 2026, 43)).toBe(true);
    expect(planShowsWeek(plan({}), 2026, 44)).toBe(false);
    expect(planShowsWeek(null, 2026, 43)).toBe(false);
  });
});
