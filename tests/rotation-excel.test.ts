import { describe, expect, it } from "vitest";
import { RotationExcelService, createXlsx, parseXlsx, useRotationExcelModules } from "./helpers/rotation-excel";

describe("Rotation Excel import/export", () => {
  useRotationExcelModules();

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
    expect(rotation?.rows[9]).toEqual([1, "Früh", "Anna Becker"]);
    expect(staff?.rows[0]).toEqual(["Name", "Teilzeit", "So muss der Name in Rotation stehen"]);
    expect(shifts?.rows[0]).toEqual([
      "Schicht",
      "Zeit",
      "Mindestbesetzung",
      "So muss die Schicht in Rotation stehen",
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

    expect(() => parseXlsx(file)).toThrow(/zu groß/);
  });
});
