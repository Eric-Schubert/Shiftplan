import { getDatabase } from "~/server/utils/database";

export default defineEventHandler((event) => {
  const query = getQuery(event);
  const year = Number(query.year);

  if (!year || year < 2020 || year > 2100) {
    throw createError({
      statusCode: 400,
      statusMessage: "Gültiges Jahr erforderlich",
    });
  }

  const db = getDatabase();

  // Alle Wochen mit Zuweisungen für dieses Jahr zählen
  const weeks = db
    .prepare(`
      SELECT 
        w.week_number,
        COUNT(sa.assignment_id) as assignment_count
      FROM weeks w
      LEFT JOIN shift_assignments sa ON w.week_id = sa.week_id
      WHERE w.year = ?
      GROUP BY w.week_id
      HAVING assignment_count > 0
      ORDER BY w.week_number
    `)
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
