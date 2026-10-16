import { describe, expect, it } from "vitest";
import type { FullRotationPattern } from "~/types/rotation";
import { patternWeeksBeyond } from "~/utils/rotation-cycle";

function pattern(weeks: Record<number, number[][]>): FullRotationPattern {
  return {
    config: { config_id: 1, cycle_length: Object.keys(weeks).length, start_year: 2026, start_week: 1 },
    weeks: Object.entries(weeks).map(([week, shifts]) => ({
      pattern_week: Number(week),
      assignments: shifts.map((staffIds, index) => ({ shift: { shift_id: index + 1 }, staff: staffIds.map((staff_id) => ({ staff_id })) })),
    })),
  } as unknown as FullRotationPattern;
}

describe("shortening the rotation cycle", () => {
  const sixWeeks = pattern({ 1: [[1, 2]], 2: [[3]], 3: [], 4: [[4], [5, 6]], 5: [[7]], 6: [] });

  it("counts the pattern weeks beyond the new length and the assignments in them", () => {
    expect(patternWeeksBeyond(sixWeeks, 3)).toEqual({ weeks: 3, assignments: 4 });
    expect(patternWeeksBeyond(sixWeeks, 5)).toEqual({ weeks: 1, assignments: 0 });
  });

  it("loses nothing when the cycle stays or grows, or while the pattern is not loaded", () => {
    expect(patternWeeksBeyond(sixWeeks, 6)).toEqual({ weeks: 0, assignments: 0 });
    expect(patternWeeksBeyond(sixWeeks, 8)).toEqual({ weeks: 0, assignments: 0 });
    expect(patternWeeksBeyond(null, 2)).toEqual({ weeks: 0, assignments: 0 });
  });
});
