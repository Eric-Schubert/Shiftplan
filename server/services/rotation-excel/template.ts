import { Buffer } from "node:buffer";
import { createXlsx, type XlsxCellValue } from "~/server/utils/xlsx";
import { RotationService } from "~/server/services/rotation.service";
import { ShiftService } from "~/server/services/shift.service";
import { StaffService } from "~/server/services/staff.service";
import { createInstructionRows } from "~/server/services/rotation-excel/instructions";

export function createRotationTemplate(): Buffer {
  const pattern = RotationService.getFullPattern();
  const staff = StaffService.getActive();
  const shifts = ShiftService.getActive();

  const rotationRows: XlsxCellValue[][] = [
    ["Rotation bearbeiten"],
    [
      "Ändere oben den Startpunkt und unten nur die Mitarbeiter-Namen. Schichtnamen müssen so bleiben wie im Blatt 'Schichten'.",
    ],
    ["Startjahr", pattern.config.start_year, "Jahr, in dem Musterwoche 1 beginnt."],
    ["Startwoche", pattern.config.start_week, "Kalenderwoche, in der Musterwoche 1 gilt."],
    [
      "Zykluslänge",
      pattern.config.cycle_length,
      "Anzahl der Musterwochen. Danach startet die Rotation wieder bei Musterwoche 1.",
    ],
    [],
    [
      "Wichtig",
      "Eine leere Mitarbeiter-Zelle bedeutet: Diese Schicht ist in dieser Musterwoche nicht besetzt.",
    ],
    [],
    ["Musterwoche", "Schicht", "Mitarbeiter (Komma getrennt)"],
  ];

  for (const week of pattern.weeks) {
    for (const assignment of week.assignments) {
      rotationRows.push([
        week.pattern_week,
        assignment.shift.name,
        assignment.staff.map((entry) => entry.name).join(", "),
      ]);
    }
  }

  const staffRows: XlsxCellValue[][] = [
    ["Name", "Teilzeit", "So muss der Name in Rotation stehen"],
    ...staff.map((entry) => [
      entry.name,
      entry.is_parttime ? "Ja" : "Nein",
      entry.name,
    ]),
  ];

  const shiftRows: XlsxCellValue[][] = [
    ["Schicht", "Zeit", "Mindestbesetzung", "So muss die Schicht in Rotation stehen"],
    ...shifts.map((entry) => [
      entry.name,
      `${entry.start_time} - ${entry.end_time}`,
      entry.min_staff,
      entry.name,
    ]),
  ];

  const instructionRows = createInstructionRows(pattern.config, shifts, staff);

  return createXlsx({
    sheets: [
      {
        name: "Anleitung",
        rows: instructionRows,
        headerRows: [1, 5, 13, 22, 30, 37],
        columnWidths: [24, 90],
      },
      {
        name: "Rotation",
        rows: rotationRows,
        headerRows: [1, 9],
        columnWidths: [16, 28, 70],
      },
      {
        name: "Mitarbeiter",
        rows: staffRows,
        headerRows: [1],
        columnWidths: [34, 12, 42],
      },
      {
        name: "Schichten",
        rows: shiftRows,
        headerRows: [1],
        columnWidths: [28, 18, 18, 42],
      },
    ],
  });
}
