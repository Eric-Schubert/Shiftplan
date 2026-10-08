import { randomBytes } from "node:crypto";
import { DayChangeService } from "~/server/services/day-change.service";
import { getDatabase } from "~/server/utils/database";
import { datesBetween } from "~/server/utils/iso-week";
import {
  ABSENCE_MAX_DAYS,
  ABSENCE_NOTE_MAX_LENGTH,
  ABSENCE_REASONS,
  type AbsenceReason,
} from "~/server/services/absence/model";

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
};

function badRequest(message: string): never {
  throw createError({ statusCode: 400, statusMessage: message });
}

/**
 * Enters one absence per day of the range. Days that already have an absence are
 * skipped; the shift comes from the plan when the person works exactly one that day.
 */
export function insertAbsences(input: CreateInput): { ids: number[]; skipped: string[] } {
  const dates = datesBetween(input.from, input.to || input.from, ABSENCE_MAX_DAYS);
  if (!dates) {
    badRequest(`Ungültiger Zeitraum (höchstens ${ABSENCE_MAX_DAYS / 7} Wochen)`);
  }
  if (!ABSENCE_REASONS.includes(input.reason)) badRequest("Ungültiger Grund");
  const note = input.note?.trim() || null;
  if (note && note.length > ABSENCE_NOTE_MAX_LENGTH) {
    badRequest(`Notiz darf maximal ${ABSENCE_NOTE_MAX_LENGTH} Zeichen haben`);
  }

  const db = getDatabase();
  if (!db.prepare("SELECT staff_id FROM staff WHERE staff_id = ?").get(input.staffId)) {
    badRequest("Unbekannter Mitarbeiter");
  }
  const explicitShift = dates.length === 1 ? (input.shiftId ?? null) : null;
  if (explicitShift !== null && !db.prepare("SELECT 1 FROM shifts WHERE shift_id = ?").get(explicitShift)) {
    badRequest("Unbekannte Schicht");
  }

  const batchId = dates.length > 1 ? randomBytes(8).toString("hex") : null;
  const exists = db.prepare(
    "SELECT 1 FROM absences WHERE staff_id = ? AND absence_date = ? AND cancelled_at IS NULL"
  );
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
    throw createError({
      statusCode: 409,
      statusMessage: dates.length === 1 ? "Für diesen Tag ist bereits ein Ausfall eingetragen" : "Für diesen Zeitraum sind bereits Ausfälle eingetragen",
    });
  }
  return { ids, skipped };
}
