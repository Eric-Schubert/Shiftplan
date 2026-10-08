import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Database as DatabaseType } from "better-sqlite3";

const originalCwd = process.cwd();

let tempDir: string | null = null;
let db: DatabaseType;
let closeDatabase: (() => void) | null = null;
let ShiftplanService: typeof import("../server/services/shiftplan.service").ShiftplanService;

async function loadModules() {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "shiftplan-generate-"));
  process.chdir(tempDir);
  vi.resetModules();

  const databaseModule = await import("../server/utils/database");
  const shiftplanModule = await import("../server/services/shiftplan.service");

  db = databaseModule.getDatabase();
  closeDatabase = databaseModule.closeDatabase;
  ShiftplanService = shiftplanModule.ShiftplanService;

  seedDatabase(db);
}

function seedDatabase(database: DatabaseType) {
  database.prepare("INSERT INTO staff (name, active, is_parttime) VALUES (?, 1, 0)").run("Anna Becker");
  database.prepare("INSERT INTO staff (name, active, is_parttime) VALUES (?, 1, 0)").run("Ben Wagner");
  database
    .prepare(
      "INSERT INTO shifts (name, active, start_time, end_time, color, min_staff, sort_order) VALUES (?, 1, ?, ?, ?, 1, 1)"
    )
    .run("Früh", "06:00", "14:00", "#22c55e");
  database
    .prepare(
      "INSERT OR IGNORE INTO rotation_config (config_id, cycle_length, start_year, start_week) VALUES (1, 2, 2026, 1)"
    )
    .run();
  database.prepare("UPDATE rotation_config SET cycle_length = 2, start_year = 2026, start_week = 1").run();
  database.prepare("INSERT INTO rotation_pattern (pattern_week, staff_id, shift_id) VALUES (1, 1, 1)").run();
  database.prepare("INSERT INTO rotation_pattern (pattern_week, staff_id, shift_id) VALUES (2, 2, 1)").run();
}

function staffInWeek(year: number, week: number): string[] {
  return (
    db
      .prepare(
        `
          SELECT s.name FROM shift_assignments sa
          JOIN weeks w ON w.week_id = sa.week_id
          JOIN staff s ON s.staff_id = sa.staff_id
          WHERE w.year = ? AND w.week_number = ?
          ORDER BY s.name
        `
      )
      .all(year, week) as Array<{ name: string }>
  ).map((row) => row.name);
}

describe("Rollout from the rotation pattern", () => {
  beforeEach(async () => {
    await loadModules();
    // KW 2 is already planned by hand with Anna; the pattern would put Ben there.
    const week = ShiftplanService.getOrCreateWeek(2026, 2);
    ShiftplanService.assignStaff(1, 1, week.week_id);
    db.prepare(
      "INSERT INTO shift_day_changes (staff_id, shift_id, change_date, kind, created_by) VALUES (2, 1, '2026-01-07', 'add', 'test')"
    ).run();
  });

  afterEach(() => {
    closeDatabase?.();
    closeDatabase = null;
    process.chdir(originalCwd);
    vi.resetModules();

    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it("previews which weeks are already planned and how many day changes they hold", () => {
    expect(ShiftplanService.previewGeneration(2026, 1, 3)).toEqual([
      { year: 2026, week: 1, pattern_week: 1, existing_assignments: 0, day_changes: 0 },
      { year: 2026, week: 2, pattern_week: 2, existing_assignments: 1, day_changes: 1 },
      { year: 2026, week: 3, pattern_week: 1, existing_assignments: 0, day_changes: 0 },
    ]);
  });

  it("keeps planned weeks unless overwrite is set", () => {
    const result = ShiftplanService.generateMultipleWeeks(2026, 1, 3, { overwrite: false });

    expect(result).toMatchObject({ generated: 2, skipped: 1, overwritten: 0 });
    expect(staffInWeek(2026, 1)).toEqual(["Anna Becker"]);
    expect(staffInWeek(2026, 2)).toEqual(["Anna Becker"]);
    expect(staffInWeek(2026, 3)).toEqual(["Anna Becker"]);
  });

  it("replaces planned weeks with overwrite and keeps day changes", () => {
    const result = ShiftplanService.generateMultipleWeeks(2026, 1, 3, { overwrite: true });

    expect(result).toMatchObject({ generated: 3, skipped: 0, overwritten: 1 });
    expect(staffInWeek(2026, 2)).toEqual(["Ben Wagner"]);
    expect(db.prepare("SELECT COUNT(*) AS count FROM shift_day_changes").get()).toEqual({ count: 1 });
  });

  it("rolls over into the next ISO year", () => {
    const result = ShiftplanService.generateMultipleWeeks(2026, 53, 2, { overwrite: false });

    expect(result.weeks.map(({ year, week }) => `${week}/${year}`)).toEqual(["53/2026", "1/2027"]);
  });

  it("leaves everything unchanged when a week fails", () => {
    const original = ShiftplanService.generateFromPattern;
    let calls = 0;
    ShiftplanService.generateFromPattern = function (year: number, week: number) {
      calls++;
      if (calls === 2) throw new Error("boom");
      return original.call(this, year, week);
    };

    try {
      expect(() => ShiftplanService.generateMultipleWeeks(2026, 1, 3, { overwrite: true })).toThrow("boom");
    } finally {
      ShiftplanService.generateFromPattern = original;
    }

    expect(staffInWeek(2026, 1)).toEqual([]);
    expect(staffInWeek(2026, 2)).toEqual(["Anna Becker"]);
  });
});
