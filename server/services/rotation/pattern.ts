import type { RotationConfig, PatternWeekData, FullRotationPattern } from "~/types/rotation";
import type { Staff } from "~/types/staff";
import type { Shift } from "~/types/shift";
import { getDatabase } from "~/server/utils/database";
import { getConfig } from "~/server/services/rotation/config";

function activeShifts(): Shift[] {
  return getDatabase()
    .prepare("SELECT * FROM shifts WHERE active = 1 ORDER BY sort_order")
    .all() as Shift[];
}

function weekAssignments(shifts: Shift[], patternWeek: number): PatternWeekData["assignments"] {
  const db = getDatabase();
  return shifts.map((shift) => {
    const staff = db
      .prepare(`
        SELECT s.* FROM staff s
        JOIN rotation_pattern rp ON s.staff_id = rp.staff_id
        WHERE rp.pattern_week = ? AND rp.shift_id = ? AND s.active = 1
        ORDER BY s.name
      `)
      .all(patternWeek, shift.shift_id) as Staff[];

    return { shift, staff };
  });
}

export function getPatternForWeek(patternWeek: number): PatternWeekData {
  return { pattern_week: patternWeek, assignments: weekAssignments(activeShifts(), patternWeek) };
}

export function getFullPattern(): FullRotationPattern {
  const config = getConfig();
  const shifts = activeShifts();
  const weeks: PatternWeekData[] = [];

  for (let week = 1; week <= config.cycle_length; week++) {
    weeks.push({ pattern_week: week, assignments: weekAssignments(shifts, week) });
  }

  return { config, weeks };
}

export function assignToPattern(patternWeek: number, staffId: number, shiftId: number): boolean {
  const db = getDatabase();
  const config = getConfig();

  if (patternWeek < 1 || patternWeek > config.cycle_length) {
    return false;
  }

  try {
    db.prepare(`
      INSERT OR IGNORE INTO rotation_pattern (pattern_week, staff_id, shift_id)
      VALUES (?, ?, ?)
    `).run(patternWeek, staffId, shiftId);
    return true;
  } catch {
    return false;
  }
}

export function unassignFromPattern(patternWeek: number, staffId: number, shiftId: number): boolean {
  const db = getDatabase();
  const result = db
    .prepare(`
      DELETE FROM rotation_pattern
      WHERE pattern_week = ? AND staff_id = ? AND shift_id = ?
    `)
    .run(patternWeek, staffId, shiftId);
  return result.changes > 0;
}

export function replacePattern(
  config: Omit<RotationConfig, "config_id">,
  entries: Array<{ pattern_week: number; staff_id: number; shift_id: number }>
): FullRotationPattern {
  const db = getDatabase();
  const current = getConfig();

  const replaceTransaction = db.transaction(() => {
    db.prepare(`
      UPDATE rotation_config
      SET cycle_length = ?, start_year = ?, start_week = ?
      WHERE config_id = ?
    `).run(config.cycle_length, config.start_year, config.start_week, current.config_id);

    db.prepare("DELETE FROM rotation_pattern").run();

    const insertPattern = db.prepare(`
      INSERT OR IGNORE INTO rotation_pattern (pattern_week, staff_id, shift_id)
      VALUES (?, ?, ?)
    `);

    for (const entry of entries) {
      insertPattern.run(entry.pattern_week, entry.staff_id, entry.shift_id);
    }
  });

  replaceTransaction();
  return getFullPattern();
}
