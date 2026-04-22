import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Database as DatabaseType } from "better-sqlite3";

const originalCwd = process.cwd();

let tempDir: string | null = null;
let db: DatabaseType;
let closeDatabase: (() => void) | null = null;
let RotationExcelService: typeof import("../server/services/rotation-excel.service").RotationExcelService;
let createXlsx: typeof import("../server/utils/xlsx").createXlsx;
let parseXlsx: typeof import("../server/utils/xlsx").parseXlsx;

async function loadModules() {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "shiftplan-rotation-excel-"));
  process.chdir(tempDir);
  vi.resetModules();

  const databaseModule = await import("../server/utils/database");
  const rotationExcelModule = await import("../server/services/rotation-excel.service");
  const xlsxModule = await import("../server/utils/xlsx");

  db = databaseModule.getDatabase();
  closeDatabase = databaseModule.closeDatabase;
  RotationExcelService = rotationExcelModule.RotationExcelService;
  createXlsx = xlsxModule.createXlsx;
  parseXlsx = xlsxModule.parseXlsx;

  seedDatabase(db);
}

function seedDatabase(database: DatabaseType) {
  database
    .prepare("INSERT INTO staff (name, active, is_parttime) VALUES (?, 1, 0)")
    .run("Anna Becker");
  database
    .prepare("INSERT INTO staff (name, active, is_parttime) VALUES (?, 1, 0)")
    .run("Ben Wagner");
  database
    .prepare("INSERT INTO staff (name, active, is_parttime) VALUES (?, 0, 0)")
    .run("Inactive Staff");

  database
    .prepare(
      "INSERT INTO shifts (name, active, start_time, end_time, color, min_staff, sort_order) VALUES (?, 1, ?, ?, ?, 1, 1)"
    )
    .run("Frueh", "06:00", "14:00", "#22c55e");
  database
    .prepare(
      "INSERT INTO shifts (name, active, start_time, end_time, color, min_staff, sort_order) VALUES (?, 1, ?, ?, ?, 1, 2)"
    )
    .run("Spaet", "14:00", "22:00", "#3b82f6");

  database
    .prepare(
      "INSERT OR IGNORE INTO rotation_config (config_id, cycle_length, start_year, start_week) VALUES (1, 2, 2026, 1)"
    )
    .run();
  database
    .prepare("INSERT INTO rotation_pattern (pattern_week, staff_id, shift_id) VALUES (1, 1, 1)")
    .run();
}

describe("Rotation Excel import/export", () => {
  beforeEach(async () => {
    await loadModules();
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

  it("creates a readable rotation template workbook", () => {
    const file = RotationExcelService.createTemplate();
    const workbook = parseXlsx(file);
    const rotation = workbook.sheets.find((sheet) => sheet.name === "Rotation");
    const staff = workbook.sheets.find((sheet) => sheet.name === "Mitarbeiter");
    const shifts = workbook.sheets.find((sheet) => sheet.name === "Schichten");

    expect(rotation).toBeDefined();
    expect(workbook.sheets.map((sheet) => sheet.name)).toEqual([
      "Anleitung",
      "Rotation",
      "Mitarbeiter",
      "Schichten",
    ]);
    expect(workbook.sheets[0]?.rows[0]?.[0]).toBe("Schichtplan Rotation - Anleitung");
    expect(rotation?.rows[2]?.[1]).toBe(2026);
    expect(rotation?.rows[3]?.[1]).toBe(1);
    expect(rotation?.rows[4]?.[1]).toBe(2);
    expect(rotation?.rows[8]).toEqual([
      "Musterwoche",
      "Schicht",
      "Mitarbeiter (Komma getrennt)",
    ]);
    expect(rotation?.rows[9]).toEqual([1, "Frueh", "Anna Becker"]);
    expect(staff?.rows[0]).toEqual(["Name", "Teilzeit", "So muss der Name in Rotation stehen"]);
    expect(shifts?.rows[0]).toEqual([
      "Schicht",
      "Zeit",
      "Mindestbesetzung",
      "So muss die Schicht in Rotation stehen",
    ]);
  });

  it("imports a filled template and replaces the rotation pattern", () => {
    const file = createXlsx({
      sheets: [
        {
          name: "Rotation",
          headerRows: [1, 7],
          rows: [
            ["Schichtplan Rotation Template"],
            [],
            ["Startjahr", 2026],
            ["Startwoche", 3],
            ["Zykluslaenge", 2],
            [],
            ["Musterwoche", "Schicht", "Mitarbeiter (Komma getrennt)"],
            [1, "Frueh", "Anna Becker, Ben Wagner"],
            [2, "Spaet", "Ben Wagner"],
          ],
        },
      ],
    });

    const result = RotationExcelService.importTemplate(file);
    const config = db.prepare("SELECT cycle_length, start_year, start_week FROM rotation_config").get();
    const assignments = db
      .prepare(
        `
          SELECT rp.pattern_week, s.name AS staff_name, sh.name AS shift_name
          FROM rotation_pattern rp
          JOIN staff s ON s.staff_id = rp.staff_id
          JOIN shifts sh ON sh.shift_id = rp.shift_id
          ORDER BY rp.pattern_week, sh.shift_id, s.name
        `
      )
      .all();

    expect(result).toMatchObject({
      success: true,
      importedRows: 2,
      importedAssignments: 3,
    });
    expect(config).toEqual({
      cycle_length: 2,
      start_year: 2026,
      start_week: 3,
    });
    expect(assignments).toEqual([
      { pattern_week: 1, staff_name: "Anna Becker", shift_name: "Frueh" },
      { pattern_week: 1, staff_name: "Ben Wagner", shift_name: "Frueh" },
      { pattern_week: 2, staff_name: "Ben Wagner", shift_name: "Spaet" },
    ]);
  });

  it("rejects oversized compressed worksheet entries before import", () => {
    const hugeCell = "A".repeat(4 * 1024 * 1024 + 1024);
    const file = createXlsx({
      sheets: [
        {
          name: "Rotation",
          rows: [[hugeCell]],
        },
      ],
    });

    expect(() => parseXlsx(file)).toThrow(/zu gross/);
  });
});
