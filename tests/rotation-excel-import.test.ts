import { describe, expect, it } from "vitest";
import { RotationExcelService, createXlsx, db, useRotationExcelModules } from "./helpers/rotation-excel";

/** A filled template: start KW 3/2026, cycle of 2 weeks, then the given pattern rows. */
function rotationFile(patternRows: Array<[number, string, string]>) {
  return createXlsx({
    sheets: [
      {
        name: "Rotation",
        headerRows: [1, 7],
        rows: [
          ["Schichtplan Rotation Template"],
          [],
          ["Startjahr", 2026],
          ["Startwoche", 3],
          ["Zykluslänge", 2],
          [],
          ["Musterwoche", "Schicht", "Mitarbeiter (Komma getrennt)"],
          ...patternRows,
        ],
      },
    ],
  });
}

describe("Rotation Excel import/export", () => {
  useRotationExcelModules();

  it("imports a filled template and replaces the rotation pattern", () => {
    const file = rotationFile([
      [1, "Früh", "Anna Becker, Ben Wagner"],
      [2, "Spät", "Ben Wagner"],
    ]);

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
      { pattern_week: 1, staff_name: "Anna Becker", shift_name: "Früh" },
      { pattern_week: 1, staff_name: "Ben Wagner", shift_name: "Früh" },
      { pattern_week: 2, staff_name: "Ben Wagner", shift_name: "Spät" },
    ]);
  });

  it("checks a file without touching the pattern on a dry run", () => {
    const file = rotationFile([[2, "Spät", "Anna Becker, Ben Wagner"]]);

    const result = RotationExcelService.importTemplate(file, { dryRun: true });

    expect(result).toMatchObject({
      dryRun: true,
      importedRows: 1,
      importedAssignments: 2,
      config: { cycle_length: 2, start_year: 2026, start_week: 3 },
    });
    expect(db.prepare("SELECT start_week FROM rotation_config").get()).toEqual({ start_week: 1 });
    expect(db.prepare("SELECT pattern_week, staff_id, shift_id FROM rotation_pattern").all()).toEqual([
      { pattern_week: 1, staff_id: 1, shift_id: 1 },
    ]);
  });
});
