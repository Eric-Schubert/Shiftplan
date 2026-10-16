import { DayChangeService } from "~/server/services/day-change.service";
import { activeStaffName, badRequest, conflict, isAbsent, today } from "~/server/services/shift-request/common";
import { requestDays } from "~/server/services/shift-request/days";
import type { AppliedChange, ShiftRequest } from "~/server/services/shift-request/types";
import { formatNoticeDay } from "~/shared/utils/notice-day";

export type PlannedChange = Omit<AppliedChange, "before" | "inPlan">;

/** Day changes that swap all shifts of two people in a range. Shared shifts stay as they are. */
export function swapChanges(staffA: number, staffB: number, dates: string[]): PlannedChange[] {
  const changes: PlannedChange[] = [];
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
export function takeoverChanges(request: ShiftRequest, helperId: number): PlannedChange[] {
  const date = request.date_from;
  const shiftId = request.shift_id!;
  const changes: PlannedChange[] = [{ staffId: request.requester_staff_id, shiftId, date, present: false }];
  for (const own of DayChangeService.shiftsOnDate(helperId, date)) {
    if (own.shift_id !== shiftId) changes.push({ staffId: helperId, shiftId: own.shift_id, date, present: false });
  }
  changes.push({ staffId: helperId, shiftId, date, present: true });
  return changes;
}

/** What the request changes if it goes through now: only days from today on that the team works. */
export function plannedChanges(request: ShiftRequest, partnerId: number): PlannedChange[] {
  const days = requestDays(request.date_from, request.date_to);
  if (request.kind === "takeover") return days.length > 0 ? takeoverChanges(request, partnerId) : [];
  return swapChanges(request.requester_staff_id, partnerId, days);
}

/** The first planned change that would put someone into a shift on a day they reported an absence. */
export function absentInChanges(changes: PlannedChange[]): PlannedChange | undefined {
  return changes.find((change) => change.present && isAbsent(change.staffId, change.date));
}

export function isPresent(staffId: number, shiftId: number, date: string): boolean {
  return DayChangeService.shiftsOnDate(staffId, date).some((shift) => shift.shift_id === shiftId);
}

/**
 * Checks right before a request changes the plan (colleague's yes, planner approval) that it still fits:
 * the plan, absences and the date may have moved on since it was created.
 */
export function checkApplicable(request: ShiftRequest, partnerId: number): void {
  const partnerName = activeStaffName(partnerId);
  if (!activeStaffName(request.requester_staff_id) || !partnerName) conflict("Die Anfrage ist nicht mehr offen");
  if (requestDays(request.date_from, request.date_to).length === 0) conflict("Die Anfrage ist abgelaufen");
  const changes = plannedChanges(request, partnerId);
  if (request.kind === "takeover") {
    const date = request.date_from;
    if (!isPresent(request.requester_staff_id, request.shift_id!, date)) {
      conflict(`${request.requester_name} ist an dem Tag nicht mehr in dieser Schicht`);
    }
    if (isPresent(partnerId, request.shift_id!, date)) conflict(`${partnerName} ist an dem Tag schon in dieser Schicht`);
  } else if (changes.length === 0) {
    conflict("Im Zeitraum gibt es nichts mehr zu tauschen");
  }
  const absent = absentInChanges(changes);
  if (absent) {
    const name = absent.staffId === partnerId ? partnerName : request.requester_name;
    conflict(`${name} hat am ${formatNoticeDay(absent.date)} einen Ausfall eingetragen`);
  }
}

/** A colleague says yes. Throws if the request can no longer be accepted by them. */
export function checkAccept(request: ShiftRequest, staffId: number): void {
  if (request.status !== "open") conflict("Die Anfrage ist nicht mehr offen");
  if (!activeStaffName(request.requester_staff_id)) conflict("Die Anfrage ist nicht mehr offen");
  if (request.date_to < today()) conflict("Die Anfrage ist abgelaufen");
  if (request.kind === "swap" && request.partner_staff_id !== staffId) {
    throw createError({ statusCode: 404, statusMessage: "Anfrage nicht gefunden" });
  }
  if (request.kind === "takeover") {
    if (request.requester_staff_id === staffId) badRequest("Die eigene Schicht kannst du nicht übernehmen");
    if (isAbsent(staffId, request.date_from)) badRequest("An dem Tag hast du selbst einen Ausfall eingetragen");
    if (isPresent(staffId, request.shift_id!, request.date_from)) badRequest("Du bist an dem Tag schon in dieser Schicht");
  }
  checkApplicable(request, staffId);
}
