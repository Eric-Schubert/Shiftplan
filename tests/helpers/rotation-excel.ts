import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, vi } from "vitest";
import type { Database as DatabaseType } from "better-sqlite3";

// Fresh modules per test, so these are reassigned in beforeEach.
export let db: DatabaseType;
export let RotationExcelService: typeof import("../../server/services/rotation-excel.service").RotationExcelService;
export let createXlsx: typeof import("../../server/utils/xlsx").createXlsx;
export let parseXlsx: typeof import("../../server/utils/xlsx").parseXlsx;

function seedDatabase(database: DatabaseType) {
  const insertStaff = database.prepare("INSERT INTO staff (name, active, is_parttime) VALUES (?, ?, 0)");
  insertStaff.run("Anna Becker", 1);
  insertStaff.run("Ben Wagner", 1);
  insertStaff.run("Inactive Staff", 0);

  const insertShift = database.prepare(
    "INSERT INTO shifts (name, active, start_time, end_time, color, min_staff, sort_order) VALUES (?, 1, ?, ?, ?, 1, ?)"
  );
  insertShift.run("Früh", "06:00", "14:00", "#22c55e", 1);
  insertShift.run("Spät", "14:00", "22:00", "#3b82f6", 2);

  database
    .prepare(
      "INSERT OR IGNORE INTO rotation_config (config_id, cycle_length, start_year, start_week) VALUES (1, 2, 2026, 1)"
    )
    .run();
  database.prepare("INSERT INTO rotation_pattern (pattern_week, staff_id, shift_id) VALUES (1, 1, 1)").run();
}

/** Real database in a temp directory with Anna, Ben (and one inactive), Früh and Spät, 2-week rotation. */
export function useRotationExcelModules() {
  const originalCwd = process.cwd();
  let tempDir: string | null = null;
  let closeDatabase: (() => void) | null = null;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "shiftplan-rotation-excel-"));
    process.chdir(tempDir);
    vi.resetModules();

    const databaseModule = await import("../../server/utils/database");
    const rotationExcelModule = await import("../../server/services/rotation-excel.service");
    const xlsxModule = await import("../../server/utils/xlsx");

    db = databaseModule.getDatabase();
    closeDatabase = databaseModule.closeDatabase;
    RotationExcelService = rotationExcelModule.RotationExcelService;
    createXlsx = xlsxModule.createXlsx;
    parseXlsx = xlsxModule.parseXlsx;

    seedDatabase(db);
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
}
