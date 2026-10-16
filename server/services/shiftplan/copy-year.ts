import { getDatabase } from "~/server/utils/database";
import { isoWeeksInYear } from "~/shared/utils/week";

export type PlannedWeek = { week_id: number; week_number: number; assignments: number };

export type CopyYearResult = {
  copiedWeeks: number;
  /** Target weeks that already had assignments and were kept. */
  skippedWeeks: number;
  /** Target weeks that already had assignments and were replaced. */
  overwrittenWeeks: number;
  /** Week 53 of the source when the target year has only 52 weeks. */
  missingWeeks: number;
  copiedAssignments: number;
  /** Assignments of deactivated staff or shifts, left out of the copy. */
  inactiveAssignments: number;
};

/** Every stored week of a year with its number of assignments. */
export function plannedWeeks(year: number): PlannedWeek[] {
  return getDatabase()
    .prepare(
      `
      SELECT w.week_id, w.week_number, COUNT(sa.assignment_id) AS assignments
      FROM weeks w
      LEFT JOIN shift_assignments sa ON sa.week_id = w.week_id
      WHERE w.year = ?
      GROUP BY w.week_id
      ORDER BY w.week_number
    `
    )
    .all(year) as PlannedWeek[];
}

/**
 * Copies the assignments of active staff in active shifts from the planned weeks of one year into
 * the same week numbers of another, in one transaction. Planned target weeks are kept unless overwrite is set.
 */
export function copyYear(sourceWeeks: PlannedWeek[], targetYear: number, overwrite: boolean): CopyYearResult {
  const db = getDatabase();
  const result: CopyYearResult = { copiedWeeks: 0, skippedWeeks: 0, overwrittenWeeks: 0, missingWeeks: 0, copiedAssignments: 0, inactiveAssignments: 0 };
  const targetWeekCount = isoWeeksInYear(targetYear);
  const createWeek = db.prepare("INSERT OR IGNORE INTO weeks (year, week_number) VALUES (?, ?)");
  const findWeek = db.prepare("SELECT week_id FROM weeks WHERE year = ? AND week_number = ?");
  const countAssignments = db.prepare("SELECT COUNT(*) AS count FROM shift_assignments WHERE week_id = ?");
  const clearWeek = db.prepare("DELETE FROM shift_assignments WHERE week_id = ?");
  const copyActive = db.prepare(`
    INSERT OR IGNORE INTO shift_assignments (staff_id, shift_id, week_id)
    SELECT sa.staff_id, sa.shift_id, ? FROM shift_assignments sa
    JOIN staff st ON st.staff_id = sa.staff_id AND st.active = 1
    JOIN shifts sh ON sh.shift_id = sa.shift_id AND sh.active = 1
    WHERE sa.week_id = ?
  `);

  db.transaction(() => {
    for (const source of sourceWeeks) {
      if (source.week_number > targetWeekCount) {
        result.missingWeeks++;
        continue;
      }

      createWeek.run(targetYear, source.week_number);
      const target = findWeek.get(targetYear, source.week_number) as { week_id: number };
      const existing = (countAssignments.get(target.week_id) as { count: number }).count;

      if (existing > 0 && !overwrite) {
        result.skippedWeeks++;
        continue;
      }

      if (existing > 0) {
        clearWeek.run(target.week_id);
        result.overwrittenWeeks++;
      }
      const copied = copyActive.run(target.week_id, source.week_id).changes;
      result.copiedAssignments += copied;
      result.inactiveAssignments += source.assignments - copied;
      result.copiedWeeks++;
    }
  })();

  return result;
}
