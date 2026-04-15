import { getDatabase } from "~/server/utils/database";
import { validateYear, validateBoolean } from "~/server/utils/validation";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  // ============================================
  // VALIDATION
  // ============================================
  const sourceYear = validateYear(body.sourceYear, "Quelljahr", { required: true })!;
  const targetYear = validateYear(body.targetYear, "Zieljahr", { required: true })!;
  const overwrite = validateBoolean(body.overwrite, "Überschreiben") === 1;

  if (sourceYear === targetYear) {
    throw createError({
      statusCode: 400,
      statusMessage: "Quell- und Zieljahr dürfen nicht identisch sein",
    });
  }

  const db = getDatabase();

  // ============================================
  // QUELL-WOCHEN MIT ZUWEISUNGEN LADEN
  // ============================================
  const sourceWeeks = db
    .prepare(`
      SELECT w.week_id, w.week_number
      FROM weeks w
      WHERE w.year = ?
      ORDER BY w.week_number
    `)
    .all(sourceYear) as Array<{ week_id: number; week_number: number }>;

  if (sourceWeeks.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: `Keine Schichtpläne für ${sourceYear} gefunden`,
    });
  }

  const weeksWithAssignments = sourceWeeks.filter((w) => {
    const count = db
      .prepare("SELECT COUNT(*) as cnt FROM shift_assignments WHERE week_id = ?")
      .get(w.week_id) as { cnt: number };
    return count.cnt > 0;
  });

  if (weeksWithAssignments.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: `Keine Zuweisungen in ${sourceYear} vorhanden`,
    });
  }

  // ============================================
  // KOPIEREN (als Transaktion)
  // ============================================
  let copiedWeeks = 0;
  let skippedWeeks = 0;
  let copiedAssignments = 0;

  const copyTransaction = db.transaction(() => {
    for (const sourceWeek of weeksWithAssignments) {
      db.prepare("INSERT OR IGNORE INTO weeks (year, week_number) VALUES (?, ?)")
        .run(targetYear, sourceWeek.week_number);

      const targetWeek = db
        .prepare("SELECT week_id FROM weeks WHERE year = ? AND week_number = ?")
        .get(targetYear, sourceWeek.week_number) as { week_id: number };

      const existingCount = db
        .prepare("SELECT COUNT(*) as cnt FROM shift_assignments WHERE week_id = ?")
        .get(targetWeek.week_id) as { cnt: number };

      if (existingCount.cnt > 0 && !overwrite) {
        skippedWeeks++;
        continue;
      }

      if (existingCount.cnt > 0 && overwrite) {
        db.prepare("DELETE FROM shift_assignments WHERE week_id = ?")
          .run(targetWeek.week_id);
      }

      const assignments = db
        .prepare("SELECT staff_id, shift_id FROM shift_assignments WHERE week_id = ?")
        .all(sourceWeek.week_id) as Array<{ staff_id: number; shift_id: number }>;

      const insertStmt = db.prepare(
        "INSERT OR IGNORE INTO shift_assignments (staff_id, shift_id, week_id) VALUES (?, ?, ?)"
      );

      for (const assignment of assignments) {
        insertStmt.run(assignment.staff_id, assignment.shift_id, targetWeek.week_id);
        copiedAssignments++;
      }

      copiedWeeks++;
    }
  });

  copyTransaction();

  return {
    success: true,
    sourceYear,
    targetYear,
    copiedWeeks,
    skippedWeeks,
    copiedAssignments,
    totalSourceWeeks: weeksWithAssignments.length,
  };
});
