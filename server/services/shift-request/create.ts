import { getDatabase } from "~/server/utils/database";
import { DayChangeService } from "~/server/services/day-change.service";
import { formatNoticeDay } from "~/server/utils/absence-notice";
import { datesBetween, parseISODate } from "~/server/utils/iso-week";
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
  if (!parseISODate(input.date)) badRequest("Ungültiges Datum");
  if (input.date < today()) badRequest("Der Tag liegt in der Vergangenheit");
  if (isOffDay(input.date)) badRequest("Am Wochenende arbeitet dein Team nicht");
  const shifts = DayChangeService.shiftsOnDate(input.staffId, input.date);
  if (shifts.length === 0) badRequest("An diesem Tag hast du keine Schicht");
  const shiftId = input.shiftId ?? (shifts.length === 1 ? shifts[0]!.shift_id : null);
  if (shiftId === null) badRequest("Bitte die Schicht wählen");
  if (!shifts.some((shift) => shift.shift_id === shiftId)) badRequest("Diese Schicht hast du an dem Tag nicht");

  const db = getDatabase();
  const existing = db
    .prepare(
      `SELECT 1 FROM shift_requests
        WHERE kind = 'takeover' AND requester_staff_id = ? AND shift_id = ? AND date_from = ?
          AND status IN ('open', 'pending_approval')`
    )
    .get(input.staffId, shiftId, input.date);
  if (existing) conflict("Für diese Schicht läuft schon eine Anfrage");

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
  if (input.partnerStaffId === input.staffId) badRequest("Tauschen geht nur mit jemand anderem");
  const partnerName = activeStaffName(input.partnerStaffId);
  if (!partnerName) badRequest("Unbekannte Kollegin oder unbekannter Kollege");
  if (!datesBetween(input.from, input.to, SWAP_MAX_DAYS)) badRequest(`Ungültiger Zeitraum (höchstens ${SWAP_MAX_DAYS / 7} Wochen)`);
  if (input.from < today()) badRequest("Der Zeitraum liegt in der Vergangenheit");
  const changes = swapChanges(input.staffId, input.partnerStaffId, requestDays(input.from, input.to));
  if (changes.length === 0) badRequest("Im Zeitraum gibt es nichts zu tauschen");
  const absent = absentInChanges(changes);
  if (absent) {
    const name = absent.staffId === input.partnerStaffId ? partnerName : activeStaffName(input.staffId);
    badRequest(`${name} hat am ${formatNoticeDay(absent.date)} einen Ausfall eingetragen`);
  }
  if (overlappingSwap(input.staffId, input.partnerStaffId, input.from, input.to)) {
    conflict("Für diesen Zeitraum läuft schon eine Tauschanfrage mit dieser Person");
  }

  const result = getDatabase()
    .prepare(
      `INSERT INTO shift_requests (kind, requester_staff_id, partner_staff_id, date_from, date_to, message, created_by)
       VALUES ('swap', ?, ?, ?, ?, ?, ?)`
    )
    .run(input.staffId, input.partnerStaffId, input.from, input.to, input.message?.trim() || null, input.createdBy);
  return getById(result.lastInsertRowid as number)!;
}
