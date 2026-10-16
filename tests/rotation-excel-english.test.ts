import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RotationExcelService, createXlsx, db, parseXlsx, useRotationExcelModules } from "./helpers/rotation-excel";

const PATTERN = "SELECT pattern_week, staff_id, shift_id FROM rotation_pattern ORDER BY 1, 2, 3";

describe("Rotation Excel template in English", () => {
  useRotationExcelModules();

  beforeEach(() => {
    // Week 42/2026; with start week 1/2026 and two weeks this is pattern week 2.
    vi.useFakeTimers({ now: new Date(2026, 9, 15), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("writes English sheets, labels and calendar weeks", () => {
    const workbook = parseXlsx(RotationExcelService.createTemplate("en"));
    const rotation = workbook.sheets.find((sheet) => sheet.name === "Rotation");
    const instructions = workbook.sheets.find((sheet) => sheet.name === "Instructions");
    const contents = instructions?.rows.find((row) => row?.[0] === "In this file")?.[1];

    expect(workbook.sheets.map((sheet) => sheet.name)).toEqual(["Instructions", "Rotation", "Shifts"]);
    expect(rotation?.rows.slice(2, 6).map((row) => row?.slice(0, 2))).toEqual([
      ["Start year", 2026],
      ["Start week", 1],
      ["Cycle length", 2],
      ["This week (Week 42/2026) is pattern week 2."],
    ]);
    expect(rotation?.rows[6]).toEqual(["Staff member", "Pattern week 1\n(Week 43, 45, 47)", "Pattern week 2\n(Week 42, 44, 46)"]);
    expect(rotation?.rows[7]).toEqual(["Anna Becker", "Früh", ""]);
    expect(contents).toBe("2 staff members, 2 shifts (Früh, Spät), 2-week cycle from Week 1/2026.");
  });

  it("imports its own template without changing the pattern", () => {
    db.prepare("INSERT INTO rotation_pattern (pattern_week, staff_id, shift_id) VALUES (2, 2, 1), (2, 2, 2)").run();
    const before = db.prepare(PATTERN).all();

    const result = RotationExcelService.importTemplate(RotationExcelService.createTemplate("en"));

    expect(result).toMatchObject({ importedRows: 2, importedAssignments: 3 });
    expect(db.prepare(PATTERN).all()).toEqual(before);
  });

  it("imports a filled English template, with “off” as a day off", () => {
    const template = parseXlsx(RotationExcelService.createTemplate("en"));
    const rows = template.sheets.find((sheet) => sheet.name === "Rotation")!.rows.map((row) => [...(row ?? [])]);
    rows[7] = ["Anna Becker", "off", "Spät"];
    rows[8] = ["Ben Wagner", "Früh", "Früh, Spät"];

    const result = RotationExcelService.importTemplate(createXlsx({ sheets: [{ name: "Rotation", rows }] }));

    expect(result).toMatchObject({ success: true, importedRows: 2, importedAssignments: 4 });
    expect(db.prepare(PATTERN).all()).toEqual([
      { pattern_week: 1, staff_id: 2, shift_id: 1 },
      { pattern_week: 2, staff_id: 1, shift_id: 2 },
      { pattern_week: 2, staff_id: 2, shift_id: 1 },
      { pattern_week: 2, staff_id: 2, shift_id: 2 },
    ]);
  });
});
