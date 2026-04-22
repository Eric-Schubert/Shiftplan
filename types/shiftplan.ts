import type { Shift } from "./shift";
import type { Staff } from "./staff";

export interface Week {
  week_id: number;
  year: number;
  week_number: number;
}

export interface ShiftWithStaff extends Shift {
  assigned_staff: Staff[];
}

export interface WeeklyShiftplan {
  week: Week;
  shifts: ShiftWithStaff[];
}

export interface WeeklyShiftplanWithPattern extends WeeklyShiftplan {
  pattern_week: number;
}

export interface ShiftplanGenerateResult {
  generated: number;
}
