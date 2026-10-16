// The loaded week plan: which week it shows and what filling it from the pattern would replace.
import type { FullRotationPattern } from "../types/rotation";
import type { WeeklyShiftplanWithPattern } from "../types/shiftplan";

/** „shift:staff“ for every weekly assignment. */
function pairs(groups: Array<{ shiftId: number; staffIds: number[] }>): Set<string> {
  return new Set(groups.flatMap((group) => group.staffIds.map((staffId) => `${group.shiftId}:${staffId}`)));
}

/**
 * How many assignments filling the week from the pattern would throw away: all of the week's, unless the week
 * already matches its pattern week. 0 means filling loses nothing and needs no confirmation.
 * Without the pattern at hand every assigned week counts as changed.
 */
export function assignmentsReplacedByFill(plan: WeeklyShiftplanWithPattern | null | undefined, pattern: FullRotationPattern | null): number {
  const planned = pairs(
    (plan?.shifts ?? []).map((shift) => ({ shiftId: shift.shift_id, staffIds: shift.assigned_staff.map((staff) => staff.staff_id) }))
  );
  if (planned.size === 0) return 0;

  const patternWeek = pattern?.weeks.find((week) => week.pattern_week === plan?.pattern_week);
  if (!patternWeek) return planned.size;

  const fromPattern = pairs(
    patternWeek.assignments.map((assignment) => ({ shiftId: assignment.shift.shift_id, staffIds: assignment.staff.map((staff) => staff.staff_id) }))
  );
  const same = planned.size === fromPattern.size && [...planned].every((pair) => fromPattern.has(pair));
  return same ? 0 : planned.size;
}

/** Whether a loaded plan belongs to the given week; while another week loads, the old plan is still there. */
export function planShowsWeek(plan: WeeklyShiftplanWithPattern | null | undefined, year: number, week: number): boolean {
  return plan?.week?.year === year && plan.week.week_number === week;
}
