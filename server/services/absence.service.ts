import { randomBytes } from "node:crypto";
import { DayChangeService } from "~/server/services/day-change.service";
import { getDatabase } from "~/server/utils/database";
import { datesBetween, datesOfISOWeek } from "~/server/utils/iso-week";

export const ABSENCE_REASONS = ["urlaub", "privat", "sonstiges"] as const;
export type AbsenceReason = (typeof ABSENCE_REASONS)[number];
export const ABSENCE_NOTE_MAX_LENGTH = 200;
/** Longest range that can be entered at once (8 weeks). */
export const ABSENCE_MAX_DAYS = 56;

// Reasons and notes are only kept as long as planning needs them.
const REASON_RETENTION_DAYS = 90;
const PURGE_INTERVAL_MS = 60 * 60 * 1000;
let lastPurge = 0;

export type Absence = {
  absence_id: number;
  staff_id: number;
  staff_name: string;
  absence_date: string;
  shift_id: number | null;
  shift_name: string | null;
  reason: AbsenceReason | null;
  note: string | null;
  /** Shared by all days entered as one range; null for a single day. */
  batch_id: string | null;
  /** First and last active day of the range (the day itself for a single day). */
  range_from: string;
  range_to: string;
  source: "web" | "app";
  created_by: string;
  created_at: string;
};

export type PublicAbsence = Omit<Absence, "reason" | "note">;

type CreateInput = {
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

const SELECT_ABSENCE = `
  SELECT a.absence_id, a.staff_id, st.name AS staff_name, a.absence_date, a.shift_id,
         sh.name AS shift_name, a.reason, a.note, a.batch_id,
         COALESCE((SELECT MIN(b.absence_date) FROM absences b
                   WHERE b.batch_id = a.batch_id AND b.cancelled_at IS NULL), a.absence_date) AS range_from,
         COALESCE((SELECT MAX(b.absence_date) FROM absences b
                   WHERE b.batch_id = a.batch_id AND b.cancelled_at IS NULL), a.absence_date) AS range_to,
         a.source, a.created_by, a.created_at
  FROM absences a
  JOIN staff st ON st.staff_id = a.staff_id
  LEFT JOIN shifts sh ON sh.shift_id = a.shift_id
`;

export const AbsenceService = {
  purgeOldReasons(now = Date.now()): void {
    if (now - lastPurge < PURGE_INTERVAL_MS) return;
    lastPurge = now;
    getDatabase()
      .prepare(
        `
          UPDATE absences SET reason = NULL, note = NULL
          WHERE (reason IS NOT NULL OR note IS NOT NULL)
            AND absence_date < date('now', ?)
        `
      )
      .run(`-${REASON_RETENTION_DAYS} days`);
  },

  listForWeek(year: number, week: number, includeReason: boolean): Array<Absence | PublicAbsence> {
    this.purgeOldReasons();
    const dates = datesOfISOWeek(year, week);
    const rows = getDatabase()
      .prepare(
        `${SELECT_ABSENCE}
          WHERE a.cancelled_at IS NULL AND a.absence_date BETWEEN ? AND ?
          ORDER BY a.absence_date, sh.sort_order, st.name
        `
      )
      .all(dates[0], dates[6]) as Absence[];

    if (includeReason) return rows;
    return rows.map(({ reason: _reason, note: _note, ...rest }) => rest);
  },

  getById(absenceId: number): Absence | undefined {
    return getDatabase()
      .prepare(`${SELECT_ABSENCE} WHERE a.absence_id = ? AND a.cancelled_at IS NULL`)
      .get(absenceId) as Absence | undefined;
  },

  listBatch(batchId: string): Absence[] {
    return getDatabase()
      .prepare(`${SELECT_ABSENCE} WHERE a.batch_id = ? AND a.cancelled_at IS NULL ORDER BY a.absence_date`)
      .all(batchId) as Absence[];
  },

  /**
   * Enters one absence per day of the range. Days that already have an absence are
   * skipped; the shift comes from the plan when the person works exactly one that day.
   */
  create(input: CreateInput): { absences: Absence[]; skipped: string[] } {
    this.purgeOldReasons();
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
    return { absences: ids.map((id) => this.getById(id)!), skipped };
  },

  cancelBatch(batchId: string): number {
    return getDatabase()
      .prepare("UPDATE absences SET cancelled_at = datetime('now') WHERE batch_id = ? AND cancelled_at IS NULL")
      .run(batchId).changes;
  },

  cancel(absenceId: number): boolean {
    const result = getDatabase()
      .prepare("UPDATE absences SET cancelled_at = datetime('now') WHERE absence_id = ? AND cancelled_at IS NULL")
      .run(absenceId);
    return result.changes > 0;
  },
};
