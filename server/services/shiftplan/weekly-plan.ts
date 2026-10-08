import type { Week, ShiftWithStaff, WeeklyShiftplan } from "~/types/shiftplan";
import type { Staff } from "~/types/staff";
import { getDatabase } from "~/server/utils/database";
import { ShiftService } from "~/server/services/shift.service";
import { RotationService } from "~/server/services/rotation.service";
import { getOrCreateWeek, getWeek } from "~/server/services/shiftplan/weeks";

export type PlanWithPatternWeek = WeeklyShiftplan & { pattern_week: number };

function assignedStaff(shiftId: number, weekId: number): Staff[] {
  return getDatabase()
    .prepare(`
      SELECT s.* FROM staff s
      JOIN shift_assignments sa ON s.staff_id = sa.staff_id
      WHERE sa.shift_id = ? AND sa.week_id = ?
    `)
    .all(shiftId, weekId) as Staff[];
}

export function getWeeklyPlan(year: number, weekNumber: number): PlanWithPatternWeek {
  const week = getOrCreateWeek(year, weekNumber);
  const shifts = ShiftService.getActive();
  const patternWeek = RotationService.calculatePatternWeek(year, weekNumber);

  const shiftsWithStaff: ShiftWithStaff[] = shifts.map((shift) => ({
    ...shift,
    assigned_staff: assignedStaff(shift.shift_id, week.week_id),
  }));

  return {
    week,
    shifts: shiftsWithStaff,
    pattern_week: patternWeek,
  };
}

export function getWeeklyPlanReadOnly(year: number, weekNumber: number): PlanWithPatternWeek {
  const existingWeek = getWeek(year, weekNumber);
  const week: Week = existingWeek || {
    week_id: 0,
    year,
    week_number: weekNumber,
  };
  const shifts = ShiftService.getActive();
  const patternWeek = RotationService.calculatePatternWeek(year, weekNumber);

  const shiftsWithStaff: ShiftWithStaff[] = shifts.map((shift) => ({
    ...shift,
    assigned_staff: existingWeek ? assignedStaff(shift.shift_id, existingWeek.week_id) : [],
  }));

  return {
    week,
    shifts: shiftsWithStaff,
    pattern_week: patternWeek,
  };
}
