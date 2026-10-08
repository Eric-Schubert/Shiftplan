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

export interface GenerationPreviewWeek {
  year: number;
  week: number;
  pattern_week: number;
  /** Assignments the week already has; a rollout replaces them only with overwrite. */
  existing_assignments: number;
  /** Day-level changes in that week. A rollout keeps them. */
  day_changes: number;
}

export interface GenerationResult {
  generated: number;
  skipped: number;
  overwritten: number;
  weeks: Array<{
    year: number;
    week: number;
    pattern_week: number;
    status: "generated" | "overwritten" | "skipped";
  }>;
}
