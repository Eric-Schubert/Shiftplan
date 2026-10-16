import { getDatabase } from "~/server/utils/database";
import { apiError } from "~/server/utils/api-error";

export default defineEventHandler((event) => {
  const query = getQuery(event);
  const year = Number(query.year);

  if (!year || year < 2020 || year > 2100) {
    throw apiError(event, 400, "errors.shiftplan.yearRequired");
  }

  const db = getDatabase();

  const weeks = db
    .prepare(
      `
      SELECT
        w.week_number,
        COUNT(sa.assignment_id) as assignment_count
      FROM weeks w
      LEFT JOIN shift_assignments sa ON w.week_id = sa.week_id
      WHERE w.year = ?
      GROUP BY w.week_id
      HAVING assignment_count > 0
      ORDER BY w.week_number
    `
    )
    .all(year) as Array<{ week_number: number; assignment_count: number }>;

  return {
    year,
    totalWeeks: weeks.length,
    totalAssignments: weeks.reduce((sum, w) => sum + w.assignment_count, 0),
    weeks: weeks.map((w) => ({
      week: w.week_number,
      assignments: w.assignment_count,
    })),
  };
});
