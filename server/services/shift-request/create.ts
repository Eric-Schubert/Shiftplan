import { getDatabase } from "~/server/utils/database";
import { DayChangeService } from "~/server/services/day-change.service";
import { datesBetween, parseISODate } from "~/shared/utils/iso-date";
import { formatNoticeDay } from "~/shared/utils/notice-day";
import { activeStaffName, badRequest, conflict, today } from "~/server/services/shift-request/common";
import { isOffDay, requestDays } from "~/server/services/shift-request/days";
import { getById } from "~/server/services/shift-request/queries";
import { absentInChanges, swapChanges } from "~/server/services/shift-request/rules";
import { SWAP_MAX_DAYS, type ShiftRequest } from "~/server/services/shift-request/types";

export function createTakeover(input: {
  staffId: number;
  date: string;
  shiftId?: number | null;
  message?: string | null;
  absenceId?: number | null;
  createdBy: string;
}): ShiftRequest {
  if (!parseISODate(input.date)) badRequest("errors.common.invalidDate");
  if (input.date < today()) badRequest("errors.requests.dayPassed");
  if (isOffDay(input.date)) badRequest("errors.requests.weekendOff");
  const shifts = DayChangeService.shiftsOnDate(input.staffId, input.date);
  if (shifts.length === 0) badRequest("errors.requests.noShiftThatDay");
  const shiftId = input.shiftId ?? (shifts.length === 1 ? shifts[0]!.shift_id : null);
  if (shiftId === null) badRequest("errors.requests.chooseShift");
  if (!shifts.some((shift) => shift.shift_id === shiftId)) badRequest("errors.requests.notYourShift");

  const db = getDatabase();
  const existing = db
    .prepare(
      `SELECT 1 FROM shift_requests
        WHERE kind = 'takeover' AND requester_staff_id = ? AND shift_id = ? AND date_from = ?
          AND status IN ('open', 'pending_approval')`
    )
    .get(input.staffId, shiftId, input.date);
  if (existing) conflict("errors.requests.duplicate");

  const result = db
    .prepare(
      `INSERT INTO shift_requests (kind, requester_staff_id, shift_id, date_from, date_to, absence_id, message, created_by)
       VALUES ('takeover', ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(input.staffId, shiftId, input.date, input.date, input.absenceId ?? null, input.message?.trim() || null, input.createdBy);
  return getById(result.lastInsertRowid as number)!;
}

/** An unfinished swap between the same two people, in either direction, that overlaps the range. */
function overlappingSwap(staffA: number, staffB: number, from: string, to: string): boolean {
  return Boolean(
    getDatabase()
      .prepare(
        `SELECT 1 FROM shift_requests
          WHERE kind = 'swap' AND status IN ('open', 'pending_approval')
            AND ((requester_staff_id = ? AND partner_staff_id = ?) OR (requester_staff_id = ? AND partner_staff_id = ?))
            AND date_from <= ? AND date_to >= ?`
      )
      .get(staffA, staffB, staffB, staffA, to, from)
  );
}

export function createSwap(input: {
  staffId: number;
  partnerStaffId: number;
  from: string;
  to: string;
  message?: string | null;
  createdBy: string;
}): ShiftRequest {
  if (input.partnerStaffId === input.staffId) badRequest("errors.requests.swapWithSelf");
  const partnerName = activeStaffName(input.partnerStaffId);
  if (!partnerName) badRequest("errors.requests.unknownPartner");
  if (!datesBetween(input.from, input.to, SWAP_MAX_DAYS)) badRequest("errors.requests.invalidRange", { weeks: SWAP_MAX_DAYS / 7 });
  if (input.from < today()) badRequest("errors.requests.rangePassed");
  const changes = swapChanges(input.staffId, input.partnerStaffId, requestDays(input.from, input.to));
  if (changes.length === 0) badRequest("errors.requests.nothingToSwap");
  const absent = absentInChanges(changes);
  if (absent) {
    const name = absent.staffId === input.partnerStaffId ? partnerName : (activeStaffName(input.staffId) ?? "");
    badRequest("errors.requests.absent", { name, day: formatNoticeDay(absent.date) });
  }
  if (overlappingSwap(input.staffId, input.partnerStaffId, input.from, input.to)) {
    conflict("errors.requests.duplicateSwap");
  }

  const result = getDatabase()
    .prepare(
      `INSERT INTO shift_requests (kind, requester_staff_id, partner_staff_id, date_from, date_to, message, created_by)
       VALUES ('swap', ?, ?, ?, ?, ?, ?)`
    )
    .run(input.staffId, input.partnerStaffId, input.from, input.to, input.message?.trim() || null, input.createdBy);
  return getById(result.lastInsertRowid as number)!;
}
