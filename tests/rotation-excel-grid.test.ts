import { describe, expect, it } from "vitest";
import type { XlsxCell } from "../server/utils/xlsx";
import { RotationExcelService, createXlsx, db, useRotationExcelModules } from "./helpers/rotation-excel";

/** The current template layout: start week 3/2026, two weeks, one row per person. */
function gridFile(staffRows: XlsxCell[][], weekHeaders = ["Woche 1\n(KW 3, 5, 7)", "Woche 2\n(KW 4, 6, 8)"]) {
  return createXlsx({
    sheets: [
      {
        name: "Rotation",
        rows: [
          ["Rotation: Wer arbeitet in welcher Woche welche Schicht?"],
          ["Gelbe Zellen ausfüllen"],
          ["Startjahr", 2026],
          ["Startwoche", 3],
          ["Zykluslänge", 2],
          [],
          ["Mitarbeiter", ...weekHeaders],
          ...staffRows,
        ],
      },
    ],
  });
}

function assignments() {
  return db
    .prepare(
      `
        SELECT rp.pattern_week, s.name AS staff_name, sh.name AS shift_name
        FROM rotation_pattern rp
        JOIN staff s ON s.staff_id = rp.staff_id
        JOIN shifts sh ON sh.shift_id = rp.shift_id
        ORDER BY rp.pattern_week, s.name, sh.shift_id
      `
    )
    .all();
}

describe("Rotation Excel import, one row per person", () => {
  useRotationExcelModules();

  it("reads one shift per week, two shifts with a comma, and empty or 'frei' as free", () => {
    const file = gridFile([
      ["Anna Becker", "Früh", { value: "", style: "input" }],
      ["ben wagner", "frei", "Früh, Spät"],
    ]);

    const result = RotationExcelService.importTemplate(file);

    expect(result).toMatchObject({ importedRows: 2, importedAssignments: 3 });
    expect(result.config).toMatchObject({ cycle_length: 2, start_year: 2026, start_week: 3 });
    expect(assignments()).toEqual([
      { pattern_week: 1, staff_name: "Anna Becker", shift_name: "Früh" },
      { pattern_week: 2, staff_name: "Ben Wagner", shift_name: "Früh" },
      { pattern_week: 2, staff_name: "Ben Wagner", shift_name: "Spät" },
    ]);
  });

  it("names the row and week of an unknown shift", () => {
    const file = gridFile([["Anna Becker", "Früh", "Nacht"]]);

    expect(() => RotationExcelService.importTemplate(file)).toThrow("Schicht 'Nacht' in Zeile 8, Woche 2 ist unbekannt oder inaktiv");
  });

  it("rejects week columns that do not match the cycle length", () => {
    expect(() => RotationExcelService.importTemplate(gridFile([["Anna Becker", "Früh"]], ["Woche 1"]))).toThrow("Die Spalte „Woche 2“ fehlt");
    expect(() => RotationExcelService.importTemplate(gridFile([["Anna Becker", "Früh"]], ["Woche 1", "Woche 2", "Woche 3"]))).toThrow(
      "Die Spalte „Woche 3“ passt nicht zur Zykluslänge 2"
    );
  });

  it("reports a missing header when a near-miss header row has gaps", () => {
    const file = createXlsx({
      sheets: [{ name: "Rotation", rows: [["Startjahr", 2026], [], ["", "Mitarbeiter_in", "Woche1"], ["Anna Becker"]] }],
    });

    expect(() => RotationExcelService.importTemplate(file)).toThrow("Die Kopfzeile mit Musterwoche, Schicht und Mitarbeiter wurde nicht gefunden");
  });

  it("asks for a name when a row has shifts but no person", () => {
    const file = gridFile([["", "Früh", ""]]);

    expect(() => RotationExcelService.importTemplate(file)).toThrow("In Zeile 8 fehlt der Name in der Spalte „Mitarbeiter“");
  });
});
