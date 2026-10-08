import { getDatabase } from "~/server/utils/database";
import { datesOfISOWeek } from "~/server/utils/iso-week";
import { insertAbsences, type CreateInput } from "~/server/services/absence/create";
import type { Absence, PublicAbsence } from "~/server/services/absence/model";
import { purgeOldReasons } from "~/server/services/absence/purge";

export {
  ABSENCE_MAX_DAYS,
  ABSENCE_NOTE_MAX_LENGTH,
  ABSENCE_REASONS,
  type Absence,
  type AbsenceReason,
  type PublicAbsence,
} from "~/server/services/absence/model";

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
  purgeOldReasons,

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

  create(input: CreateInput): { absences: Absence[]; skipped: string[] } {
    this.purgeOldReasons();
    const { ids, skipped } = insertAbsences(input);
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
