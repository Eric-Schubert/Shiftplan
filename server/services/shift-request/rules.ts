import { DayChangeService } from "~/server/services/day-change.service";
import { badRequest, conflict, isAbsent, today } from "~/server/services/shift-request/common";
import type { AppliedChange, ShiftRequest } from "~/server/services/shift-request/types";

/** Day changes that swap all shifts of two people in a range. Shared shifts stay as they are. */
export function swapChanges(staffA: number, staffB: number, dates: string[]): Array<Omit<AppliedChange, "before">> {
  const changes: Array<Omit<AppliedChange, "before">> = [];
  for (const date of dates) {
    const shiftsA = new Set(DayChangeService.shiftsOnDate(staffA, date).map((shift) => shift.shift_id));
    const shiftsB = new Set(DayChangeService.shiftsOnDate(staffB, date).map((shift) => shift.shift_id));
    for (const shiftId of shiftsA) {
      if (shiftsB.has(shiftId)) continue;
      changes.push({ staffId: staffA, shiftId, date, present: false }, { staffId: staffB, shiftId, date, present: true });
    }
    for (const shiftId of shiftsB) {
      if (shiftsA.has(shiftId)) continue;
      changes.push({ staffId: staffB, shiftId, date, present: false }, { staffId: staffA, shiftId, date, present: true });
    }
  }
  return changes;
}

/** Day changes of a takeover: the requester leaves the shift, the helper leaves their own and joins it. */
export function takeoverChanges(request: ShiftRequest, helperId: number): Array<Omit<AppliedChange, "before">> {
  const date = request.date_from;
  const shiftId = request.shift_id!;
  const changes: Array<Omit<AppliedChange, "before">> = [
    { staffId: request.requester_staff_id, shiftId, date, present: false },
  ];
  for (const own of DayChangeService.shiftsOnDate(helperId, date)) {
    if (own.shift_id !== shiftId) changes.push({ staffId: helperId, shiftId: own.shift_id, date, present: false });
  }
  changes.push({ staffId: helperId, shiftId, date, present: true });
  return changes;
}

/** A colleague says yes. Throws if the request can no longer be accepted by them. */
export function checkAccept(request: ShiftRequest, staffId: number): void {
  if (request.status !== "open") conflict("Die Anfrage ist nicht mehr offen");
  if (request.date_to < today()) conflict("Die Anfrage ist abgelaufen");
  if (request.kind === "swap") {
    if (request.partner_staff_id !== staffId) throw createError({ statusCode: 404, statusMessage: "Anfrage nicht gefunden" });
    return;
  }
  if (request.requester_staff_id === staffId) badRequest("Die eigene Schicht kannst du nicht übernehmen");
  if (isAbsent(staffId, request.date_from)) badRequest("An dem Tag hast du selbst einen Ausfall eingetragen");
  const already = DayChangeService.shiftsOnDate(staffId, request.date_from).some(
    (shift) => shift.shift_id === request.shift_id
  );
  if (already) badRequest("Du bist an dem Tag schon in dieser Schicht");
}

export function isPresent(staffId: number, shiftId: number, date: string): boolean {
  return DayChangeService.shiftsOnDate(staffId, date).some((shift) => shift.shift_id === shiftId);
}
