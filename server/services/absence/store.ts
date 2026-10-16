import { getDatabase } from "~/server/utils/database";
import { datesOfISOWeek } from "~/shared/utils/week";
import { insertAbsences, type CreateInput } from "~/server/services/absence/create";
import type { Absence, PublicAbsence } from "~/server/services/absence/model";
import { purgeOldReasons } from "~/server/services/absence/purge";
import { resolveShifts } from "~/server/services/absence/resolve";

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
    const stored = getDatabase()
      .prepare(
        `${SELECT_ABSENCE}
          WHERE a.cancelled_at IS NULL AND a.absence_date BETWEEN ? AND ?
          ORDER BY a.absence_date, sh.sort_order, st.name
        `
      )
      .all(dates[0], dates[6]) as Absence[];
    const rows = resolveShifts(stored);

    if (includeReason) return rows;
    return rows.map(({ reason: _reason, note: _note, ...rest }) => rest);
  },

  getById(absenceId: number): Absence | undefined {
    return getDatabase().prepare(`${SELECT_ABSENCE} WHERE a.absence_id = ? AND a.cancelled_at IS NULL`).get(absenceId) as Absence | undefined;
  },

  listBatch(batchId: string): Absence[] {
    return getDatabase().prepare(`${SELECT_ABSENCE} WHERE a.batch_id = ? AND a.cancelled_at IS NULL ORDER BY a.absence_date`).all(batchId) as Absence[];
  },

  create(input: CreateInput): { absences: Absence[]; skipped: string[] } {
    this.purgeOldReasons();
    const { ids, skipped } = insertAbsences(input);
    return { absences: ids.map((id) => this.getById(id)!), skipped };
  },

  /** Withdraws the given days; returns how many were still active. */
  cancel(absenceIds: number[]): number {
    if (absenceIds.length === 0) return 0;
    return getDatabase()
      .prepare(
        `UPDATE absences SET cancelled_at = datetime('now')
          WHERE cancelled_at IS NULL AND absence_id IN (${absenceIds.map(() => "?").join(",")})`
      )
      .run(...absenceIds).changes;
  },
};
