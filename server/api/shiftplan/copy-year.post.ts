import { getDatabase } from "~/server/utils/database";

interface CopyYearBody {
  sourceYear: number;
  targetYear: number;
  overwrite?: boolean; // Bestehende Zuweisungen im Zieljahr überschreiben?
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CopyYearBody>(event);

  // ============================================
  // VALIDATION
  // ============================================
  if (!body.sourceYear || !body.targetYear) {
    throw createError({
      statusCode: 400,
      statusMessage: "Quell- und Zieljahr erforderlich",
    });
  }

  if (body.sourceYear === body.targetYear) {
    throw createError({
      statusCode: 400,
      statusMessage: "Quell- und Zieljahr dürfen nicht identisch sein",
    });
  }

  if (body.sourceYear < 2020 || body.sourceYear > 2100 || body.targetYear < 2020 || body.targetYear > 2100) {
    throw createError({
      statusCode: 400,
      statusMessage: "Jahr muss zwischen 2020 und 2100 liegen",
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
    .all(body.sourceYear) as Array<{ week_id: number; week_number: number }>;

  if (sourceWeeks.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: `Keine Schichtpläne für ${body.sourceYear} gefunden`,
    });
  }

  // Zähle wie viele Wochen tatsächlich Zuweisungen haben
  const weeksWithAssignments = sourceWeeks.filter((w) => {
    const count = db
      .prepare("SELECT COUNT(*) as cnt FROM shift_assignments WHERE week_id = ?")
      .get(w.week_id) as { cnt: number };
    return count.cnt > 0;
  });

  if (weeksWithAssignments.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: `Keine Zuweisungen in ${body.sourceYear} vorhanden`,
    });
  }

  // ============================================
  // KOPIEREN (als Transaktion)
  // ============================================
  const overwrite = body.overwrite ?? false;
  let copiedWeeks = 0;
  let skippedWeeks = 0;
  let copiedAssignments = 0;

  const copyTransaction = db.transaction(() => {
    for (const sourceWeek of weeksWithAssignments) {
      // Ziel-Woche erstellen oder holen
      db.prepare("INSERT OR IGNORE INTO weeks (year, week_number) VALUES (?, ?)")
        .run(body.targetYear, sourceWeek.week_number);

      const targetWeek = db
        .prepare("SELECT week_id FROM weeks WHERE year = ? AND week_number = ?")
        .get(body.targetYear, sourceWeek.week_number) as { week_id: number };

      // Prüfe ob Ziel-Woche bereits Zuweisungen hat
      const existingCount = db
        .prepare("SELECT COUNT(*) as cnt FROM shift_assignments WHERE week_id = ?")
        .get(targetWeek.week_id) as { cnt: number };

      if (existingCount.cnt > 0 && !overwrite) {
        skippedWeeks++;
        continue;
      }

      // Bei Overwrite: bestehende Zuweisungen löschen
      if (existingCount.cnt > 0 && overwrite) {
        db.prepare("DELETE FROM shift_assignments WHERE week_id = ?")
          .run(targetWeek.week_id);
      }

      // Zuweisungen kopieren
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
    sourceYear: body.sourceYear,
    targetYear: body.targetYear,
    copiedWeeks,
    skippedWeeks,
    copiedAssignments,
    totalSourceWeeks: weeksWithAssignments.length,
  };
});
