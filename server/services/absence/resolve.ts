import { DayChangeService } from "~/server/services/day-change.service";
import type { Absence } from "~/server/services/absence/model";

type WithShift = Pick<Absence, "staff_id" | "absence_date" | "shift_id" | "shift_name">;

/**
 * An absence keeps the shift the person worked when it was entered. Once the plan no longer has
 * them in that shift (new week plan, swap, day change), it covers the whole day instead, so they
 * never count as working the shift they were moved to.
 */
export function resolveShifts<T extends WithShift>(rows: T[]): T[] {
  return rows.map((row) => {
    if (row.shift_id === null) return row;
    const works = DayChangeService.shiftsOnDate(row.staff_id, row.absence_date).some((shift) => shift.shift_id === row.shift_id);
    return works ? row : { ...row, shift_id: null, shift_name: null };
  });
}
