import { randomBytes } from "node:crypto";
import { DayChangeService } from "~/server/services/day-change.service";
import { getDatabase } from "~/server/utils/database";
import { datesBetween, isWeekendDate } from "~/shared/utils/iso-date";
import { ABSENCE_MAX_DAYS, ABSENCE_NOTE_MAX_LENGTH, ABSENCE_REASONS, type AbsenceReason } from "~/server/services/absence/model";
import type { MessageKey } from "~/server/lib/i18n/translate";
import { apiError, type ErrorParams } from "~/server/utils/api-error";

export type CreateInput = {
  staffId: number;
  from: string;
  /** Last day of the range; defaults to `from`. */
  to?: string | null;
  /** Only for a single day; otherwise the shift is taken from the plan. */
  shiftId?: number | null;
  reason: AbsenceReason;
  note?: string | null;
  source: "web" | "app";
  createdBy: string;
  /** Longest allowed range; defaults to ABSENCE_MAX_DAYS. */
  maxDays?: number;
  /** Leave out Saturdays and Sundays, for teams that never work weekends. */
  weekdaysOnly?: boolean;
  /** First day that may be entered (YYYY-MM-DD); staff report from today on only. */
  notBefore?: string;
};

function badRequest(key: MessageKey, params?: ErrorParams): never {
  throw apiError(null, 400, key, params);
}

/**
 * Enters one absence per day of the range. Days that already have an absence are
 * skipped; the shift comes from the plan when the person works exactly one that day.
 */
export function insertAbsences(input: CreateInput): { ids: number[]; skipped: string[] } {
  const maxDays = input.maxDays ?? ABSENCE_MAX_DAYS;
  const range = datesBetween(input.from, input.to || input.from, maxDays);
  if (!range) {
    badRequest(maxDays === ABSENCE_MAX_DAYS ? "errors.absences.rangeTooLongWeeks" : "errors.absences.rangeTooLongYear");
  }
  if (input.notBefore && range[0]! < input.notBefore) badRequest("errors.absences.onlyFromToday");
  const dates = input.weekdaysOnly ? range.filter((date) => !isWeekendDate(date)) : range;
  if (dates.length === 0) badRequest("errors.absences.weekendOff");
  if (!ABSENCE_REASONS.includes(input.reason)) badRequest("errors.absences.invalidReason");
  const note = input.note?.trim() || null;
  if (note && note.length > ABSENCE_NOTE_MAX_LENGTH) {
    badRequest("errors.absences.noteTooLong", { max: ABSENCE_NOTE_MAX_LENGTH });
  }

  const db = getDatabase();
  if (!db.prepare("SELECT staff_id FROM staff WHERE staff_id = ?").get(input.staffId)) {
    badRequest("errors.common.unknownStaff");
  }
  const explicitShift = dates.length === 1 ? (input.shiftId ?? null) : null;
  if (explicitShift !== null && !db.prepare("SELECT 1 FROM shifts WHERE shift_id = ?").get(explicitShift)) {
    badRequest("errors.common.unknownShift");
  }

  const batchId = dates.length > 1 ? randomBytes(8).toString("hex") : null;
  const exists = db.prepare("SELECT 1 FROM absences WHERE staff_id = ? AND absence_date = ? AND cancelled_at IS NULL");
  const insert = db.prepare(
    `
      INSERT INTO absences (staff_id, absence_date, shift_id, reason, note, batch_id, source, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
  );

  const skipped: string[] = [];
  const ids: number[] = [];
  db.transaction(() => {
    for (const date of dates) {
      if (exists.get(input.staffId, date)) {
        skipped.push(date);
        continue;
      }
      const shifts = DayChangeService.shiftsOnDate(input.staffId, date);
      const shiftId = explicitShift ?? (shifts.length === 1 ? shifts[0]!.shift_id : null);
      const result = insert.run(input.staffId, date, shiftId, input.reason, note, batchId, input.source, input.createdBy);
      ids.push(result.lastInsertRowid as number);
    }
  })();

  if (ids.length === 0) {
    throw apiError(null, 409, dates.length === 1 ? "errors.absences.dayTaken" : "errors.absences.rangeTaken");
  }
  return { ids, skipped };
}
