import { getDatabase } from "~/server/utils/database";
import { datesOfISOWeek, parseISODate, toISOWeek } from "~/server/utils/iso-week";

export const ABSENCE_REASONS = ["krank", "privat", "sonstiges"] as const;
export type AbsenceReason = (typeof ABSENCE_REASONS)[number];
export const ABSENCE_NOTE_MAX_LENGTH = 200;

// Health-related reasons are only kept as long as planning needs them.
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
  source: "web" | "app";
  created_by: string;
  created_at: string;
};

export type PublicAbsence = Omit<Absence, "reason" | "note">;

type CreateInput = {
  staffId: number;
  date: string;
  shiftId?: number | null;
  reason: AbsenceReason;
  note?: string | null;
  source: "web" | "app";
  createdBy: string;
  /** Staff may only report absences for days they are assigned to. */
  requireAssignment: boolean;
};

function badRequest(message: string): never {
  throw createError({ statusCode: 400, statusMessage: message });
}

function assignedShifts(staffId: number, year: number, week: number): Array<{ shift_id: number; name: string }> {
  return getDatabase()
    .prepare(
      `
        SELECT s.shift_id, s.name FROM shift_assignments sa
        JOIN weeks w ON w.week_id = sa.week_id
        JOIN shifts s ON s.shift_id = sa.shift_id
        WHERE sa.staff_id = ? AND w.year = ? AND w.week_number = ?
        ORDER BY s.sort_order, s.name
      `
    )
    .all(staffId, year, week) as Array<{ shift_id: number; name: string }>;
}

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
        `
          SELECT a.absence_id, a.staff_id, st.name AS staff_name, a.absence_date, a.shift_id,
                 sh.name AS shift_name, a.reason, a.note, a.source, a.created_by, a.created_at
          FROM absences a
          JOIN staff st ON st.staff_id = a.staff_id
          LEFT JOIN shifts sh ON sh.shift_id = a.shift_id
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
      .prepare(
        `
          SELECT a.absence_id, a.staff_id, st.name AS staff_name, a.absence_date, a.shift_id,
                 sh.name AS shift_name, a.reason, a.note, a.source, a.created_by, a.created_at
          FROM absences a
          JOIN staff st ON st.staff_id = a.staff_id
          LEFT JOIN shifts sh ON sh.shift_id = a.shift_id
          WHERE a.absence_id = ? AND a.cancelled_at IS NULL
        `
      )
      .get(absenceId) as Absence | undefined;
  },

  create(input: CreateInput): Absence {
    this.purgeOldReasons();
    const parsed = parseISODate(input.date);
    if (!parsed) badRequest("Ungültiges Datum");
    if (!ABSENCE_REASONS.includes(input.reason)) badRequest("Ungültiger Grund");
    const note = input.note?.trim() || null;
    if (note && note.length > ABSENCE_NOTE_MAX_LENGTH) {
      badRequest(`Notiz darf maximal ${ABSENCE_NOTE_MAX_LENGTH} Zeichen haben`);
    }

    const db = getDatabase();
    const staff = db.prepare("SELECT staff_id FROM staff WHERE staff_id = ?").get(input.staffId);
    if (!staff) badRequest("Unbekannter Mitarbeiter");

    const { year, week } = toISOWeek(parsed.year, parsed.month, parsed.day);
    const shifts = assignedShifts(input.staffId, year, week);
    let shiftId = input.shiftId ?? null;

    if (input.requireAssignment) {
      if (shifts.length === 0) badRequest("An diesem Tag bist du keiner Schicht zugeteilt");
      if (shiftId === null && shifts.length > 1) badRequest("Bitte die betroffene Schicht wählen");
      shiftId ??= shifts[0]!.shift_id;
      if (!shifts.some((shift) => shift.shift_id === shiftId)) badRequest("Dieser Schicht bist du nicht zugeteilt");
    } else {
      shiftId ??= shifts.length === 1 ? shifts[0]!.shift_id : null;
      if (shiftId !== null && !db.prepare("SELECT 1 FROM shifts WHERE shift_id = ?").get(shiftId)) {
        badRequest("Unbekannte Schicht");
      }
    }

    try {
      const result = db
        .prepare(
          `
            INSERT INTO absences (staff_id, absence_date, shift_id, reason, note, source, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `
        )
        .run(input.staffId, input.date, shiftId, input.reason, note, input.source, input.createdBy);
      return this.getById(result.lastInsertRowid as number)!;
    } catch (error) {
      if (String((error as Error).message).includes("UNIQUE")) {
        throw createError({ statusCode: 409, statusMessage: "Für diesen Tag ist bereits ein Ausfall eingetragen" });
      }
      throw error;
    }
  },

  cancel(absenceId: number): boolean {
    const result = getDatabase()
      .prepare("UPDATE absences SET cancelled_at = datetime('now') WHERE absence_id = ? AND cancelled_at IS NULL")
      .run(absenceId);
    return result.changes > 0;
  },
};
