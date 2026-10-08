import type { Week } from "~/types/shiftplan";
import { getDatabase } from "~/server/utils/database";

export function getWeek(year: number, weekNumber: number): Week | null {
  const db = getDatabase();
  const week = db
    .prepare("SELECT * FROM weeks WHERE year = ? AND week_number = ?")
    .get(year, weekNumber) as Week | undefined;

  return week || null;
}

export function getOrCreateWeek(year: number, weekNumber: number): Week {
  const db = getDatabase();

  let week = db
    .prepare("SELECT * FROM weeks WHERE year = ? AND week_number = ?")
    .get(year, weekNumber) as Week | undefined;

  if (!week) {
    const result = db
      .prepare("INSERT INTO weeks (year, week_number) VALUES (?, ?)")
      .run(year, weekNumber);
    week = {
      week_id: result.lastInsertRowid as number,
      year,
      week_number: weekNumber,
    };
  }

  return week;
}

export function hasAssignment(staffId: number, shiftId: number, weekId: number): boolean {
  const db = getDatabase();
  const assignment = db
    .prepare(`
      SELECT assignment_id FROM shift_assignments
      WHERE staff_id = ? AND shift_id = ? AND week_id = ?
    `)
    .get(staffId, shiftId, weekId);

  return Boolean(assignment);
}

export function assignStaff(staffId: number, shiftId: number, weekId: number): boolean {
  const db = getDatabase();
  try {
    db.prepare(`
      INSERT OR IGNORE INTO shift_assignments (staff_id, shift_id, week_id)
      VALUES (?, ?, ?)
    `).run(staffId, shiftId, weekId);
    return true;
  } catch {
    return false;
  }
}

export function unassignStaff(staffId: number, shiftId: number, weekId: number): boolean {
  const db = getDatabase();
  const result = db
    .prepare(`
      DELETE FROM shift_assignments
      WHERE staff_id = ? AND shift_id = ? AND week_id = ?
    `)
    .run(staffId, shiftId, weekId);
  return result.changes > 0;
}
