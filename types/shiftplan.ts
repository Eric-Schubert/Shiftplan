import type { Shift } from "./shift";
import type { Staff } from "./staff";

export interface Week {
  week_id: number;
  year: number;
  week_number: number;
}

export interface ShiftAssignment {
  assignment_id: number;
  staff_id: number;
  shift_id: number;
  week_id: number;
}

export interface ShiftWithStaff extends Shift {
  assigned_staff: Staff[];
}

export interface WeeklyShiftplan {
  week: Week;
  shifts: ShiftWithStaff[];
}
