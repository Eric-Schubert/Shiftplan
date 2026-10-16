import type { Absence } from "../types/absence";
import type { ShiftDayChange, ShiftWithStaff } from "../types/shiftplan";
import { datesOfISOWeek } from "~/shared/utils/week";

/** Days the team works: Mo–Fr, or the whole week for teams with weekend shifts. */
export function workDates(year: number, week: number, weekends: boolean): string[] {
  return datesOfISOWeek(year, week).slice(0, weekends ? 7 : 5);
}

/** Whether an absence takes the person out of this shift (shift-less absences count everywhere). */
export function absentFrom(absences: Absence[], shiftId: number, staffId: number, date: string): boolean {
  return absences.some(
    (absence) =>
      absence.staff_id === staffId &&
      absence.absence_date === date &&
      (absence.shift_id === null || absence.shift_id === shiftId)
  );
}

/** Who actually works the shift on one day after day changes and absences. */
export function staffOnDay(
  shift: ShiftWithStaff,
  date: string,
  dayChanges: ShiftDayChange[],
  absences: Absence[]
): number[] {
  const staff = new Set(shift.assigned_staff.map((member) => member.staff_id));
  for (const change of dayChanges) {
    if (change.shift_id !== shift.shift_id || change.change_date !== date) continue;
    if (change.kind === "add") staff.add(change.staff_id);
    else staff.delete(change.staff_id);
  }
  return [...staff].filter((staffId) => !absentFrom(absences, shift.shift_id, staffId, date));
}

/** Work days on which the shift has fewer people than it needs. */
export function understaffedDates(
  shift: ShiftWithStaff,
  dates: string[],
  dayChanges: ShiftDayChange[],
  absences: Absence[]
): string[] {
  return dates.filter((date) => staffOnDay(shift, date, dayChanges, absences).length < shift.min_staff);
}
