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

/** Someone joins (`add`) or leaves (`remove`) a shift for one day only. */
export interface ShiftDayChange {
  change_id: number;
  staff_id: number;
  staff_name: string;
  shift_id: number;
  shift_name: string;
  change_date: string;
  kind: "add" | "remove";
  source: "web" | "app";
  created_by: string;
  created_at: string;
}

export interface WeeklyShiftplan {
  week: Week;
  shifts: ShiftWithStaff[];
  /** Day-level exceptions to the weekly assignments. */
  day_changes?: ShiftDayChange[];
}

export interface WeeklyShiftplanWithPattern extends WeeklyShiftplan {
  pattern_week: number;
}

export interface ShiftplanGenerateResult {
  generated: number;
}
