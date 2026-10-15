import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readZip } from "../server/lib/xlsx/zip-read";
import { RotationExcelService, createXlsx, db, parseXlsx, useRotationExcelModules } from "./helpers/rotation-excel";

describe("Rotation Excel template", () => {
  useRotationExcelModules();

  beforeEach(() => {
    // KW 42/2026; with start KW 1/2026 and two weeks this is pattern week 2.
    vi.useFakeTimers({ now: new Date(2026, 9, 15), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists every person with one column per pattern week", () => {
    const file = RotationExcelService.createTemplate();
    const workbook = parseXlsx(file);
    const rotation = workbook.sheets.find((sheet) => sheet.name === "Rotation");
    const shifts = workbook.sheets.find((sheet) => sheet.name === "Schichten");

    expect(workbook.sheets.map((sheet) => sheet.name)).toEqual(["Rotation", "Anleitung", "Schichten"]);
    expect(rotation?.rows[2]?.slice(0, 2)).toEqual(["Startjahr", 2026]);
    expect(rotation?.rows[3]?.slice(0, 2)).toEqual(["Startwoche", 1]);
    expect(rotation?.rows[4]?.slice(0, 2)).toEqual(["Zykluslänge", 2]);
    expect(rotation?.rows[5]).toEqual(["Gerade (KW 42/2026) läuft Woche 2."]);
    expect(rotation?.rows[6]).toEqual([
      "Mitarbeiter",
      "Woche 1\n(KW 43, 45, 47)",
      "Woche 2\n(KW 42, 44, 46)",
    ]);
    expect(rotation?.rows[7]).toEqual(["Anna Becker", "Früh", ""]);
    expect(rotation?.rows[8]).toEqual(["Ben Wagner", "", ""]);
    expect(rotation?.rows.flat()).not.toContain("Inactive Staff");
    expect(shifts?.rows).toEqual([
      ["Schicht", "Zeit", "Mindestbesetzung"],
      ["Früh", "06:00 - 14:00", 1],
      ["Spät", "14:00 - 22:00", 1],
    ]);
  });

  it("offers the shifts as a dropdown and explains the weeks with real calendar weeks", () => {
    const file = RotationExcelService.createTemplate();
    const workbook = parseXlsx(file);
    const instructions = workbook.sheets.find((sheet) => sheet.name === "Anleitung");
    const example = instructions?.rows.find((row) => row?.[0] === "Beispiel")?.[1];

    const rotationXml = readZip(file).get("xl/worksheets/sheet1.xml")?.toString("utf-8");

    expect(String(example)).toContain("in KW 43 Früh und in KW 44 frei");
    expect(String(example)).toContain("ab KW 45 wieder Früh");
    expect(rotationXml).toContain('sqref="B8:C9"><formula1>Schichten!$A$2:$A$3</formula1>');
    expect(rotationXml).toContain('<sheetView tabSelected="1" workbookViewId="0"><pane xSplit="1" ySplit="7" topLeftCell="B8"');
  });

  it("imports its own template without changing the pattern", () => {
    db.prepare("INSERT INTO rotation_pattern (pattern_week, staff_id, shift_id) VALUES (2, 2, 1), (2, 2, 2)").run();
    const before = db.prepare("SELECT pattern_week, staff_id, shift_id FROM rotation_pattern ORDER BY 1, 2, 3").all();

    const result = RotationExcelService.importTemplate(RotationExcelService.createTemplate());

    expect(result).toMatchObject({ importedRows: 2, importedAssignments: 3 });
    expect(db.prepare("SELECT pattern_week, staff_id, shift_id FROM rotation_pattern ORDER BY 1, 2, 3").all()).toEqual(
      before
    );
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

    expect(() => parseXlsx(file)).toThrow(/zu groß/);
  });
});
