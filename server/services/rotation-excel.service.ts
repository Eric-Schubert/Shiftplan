import { Buffer } from "node:buffer";
import { createXlsx, parseXlsx, type XlsxCellValue } from "~/server/utils/xlsx";
import { RotationService } from "~/server/services/rotation.service";
import { ShiftService } from "~/server/services/shift.service";
import { StaffService } from "~/server/services/staff.service";
import type { RotationConfig } from "~/types/rotation";
import type { Shift } from "~/types/shift";
import type { Staff } from "~/types/staff";

type RotationExcelEntry = {
  pattern_week: number;
  staff_id: number;
  shift_id: number;
};

export type RotationExcelImportResult = {
  success: true;
  config: RotationConfig;
  importedRows: number;
  importedAssignments: number;
};

type HeaderColumns = {
  headerRow: number;
  patternWeek: number;
  shiftId?: number;
  shiftName: number;
  staffNames: number;
};

export const RotationExcelService = {
  createTemplate(): Buffer {
    const pattern = RotationService.getFullPattern();
    const staff = StaffService.getActive();
    const shifts = ShiftService.getActive();

    const rotationRows: XlsxCellValue[][] = [
      ["Rotation bearbeiten"],
      [
        "Aendere oben den Startpunkt und unten nur die Mitarbeiter-Namen. Schichtnamen muessen so bleiben wie im Blatt 'Schichten'.",
      ],
      ["Startjahr", pattern.config.start_year, "Jahr, in dem Musterwoche 1 beginnt."],
      ["Startwoche", pattern.config.start_week, "Kalenderwoche, in der Musterwoche 1 gilt."],
      [
        "Zykluslaenge",
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
  },

  importTemplate(fileData: Buffer): RotationExcelImportResult {
    const workbook = parseXlsx(fileData);
    const rotationSheet =
      workbook.sheets.find((sheet) => normalizeName(sheet.name) === "rotation") ||
      workbook.sheets[0];

    if (!rotationSheet) {
      badRequest("Die Excel-Datei enthaelt kein Arbeitsblatt");
    }

    const config = parseConfig(rotationSheet.rows);
    const columns = findHeaderColumns(rotationSheet.rows);
    const activeStaff = StaffService.getActive();
    const activeShifts = ShiftService.getActive();
    const staffByName = makeNameLookup(activeStaff, "Mitarbeiter");
    const shiftsByName = makeNameLookup(activeShifts, "Schicht");
    const shiftsById = new Map(activeShifts.map((shift) => [shift.shift_id, shift]));
    const entries: RotationExcelEntry[] = [];
    const seenAssignments = new Set<string>();
    let importedRows = 0;

    for (let rowIndex = columns.headerRow + 1; rowIndex < rotationSheet.rows.length; rowIndex++) {
      const row = rotationSheet.rows[rowIndex] || [];
      const rowNumber = rowIndex + 1;
      const hasContent = [
        row[columns.patternWeek],
        columns.shiftId !== undefined ? row[columns.shiftId] : undefined,
        row[columns.shiftName],
        row[columns.staffNames],
      ].some((value) => toText(value) !== "");

      if (!hasContent) continue;

      importedRows++;

      const patternWeek = toInteger(row[columns.patternWeek], `Musterwoche in Zeile ${rowNumber}`);
      if (patternWeek < 1 || patternWeek > config.cycle_length) {
        badRequest(
          `Musterwoche in Zeile ${rowNumber} muss zwischen 1 und ${config.cycle_length} liegen`
        );
      }

      const shift = resolveShift({
        rowNumber,
        shiftIdValue: columns.shiftId !== undefined ? row[columns.shiftId] : undefined,
        shiftNameValue: row[columns.shiftName],
        shiftsById,
        shiftsByName,
      });

      for (const staffName of splitStaffNames(row[columns.staffNames])) {
        const staff = resolveByName(staffByName, staffName, "Mitarbeiter", rowNumber);
        const key = `${patternWeek}:${staff.staff_id}:${shift.shift_id}`;

        if (!seenAssignments.has(key)) {
          seenAssignments.add(key);
          entries.push({
            pattern_week: patternWeek,
            staff_id: staff.staff_id,
            shift_id: shift.shift_id,
          });
        }
      }
    }

    if (importedRows === 0) {
      badRequest("Im Blatt 'Rotation' wurden keine Datenzeilen gefunden");
    }

    const updatedPattern = RotationService.replacePattern(config, entries);

    return {
      success: true,
      config: updatedPattern.config,
      importedRows,
      importedAssignments: entries.length,
    };
  },
};

function createInstructionRows(
  config: RotationConfig,
  shifts: Shift[],
  staff: Staff[]
): XlsxCellValue[][] {
  const firstShift = shifts[0]?.name || "Frueh";
  const secondShift = shifts[1]?.name || "Spaet";
  const firstStaff = staff[0]?.name || "Anna Beispiel";
  const secondStaff = staff[1]?.name || "Ben Beispiel";

  return [
    ["Schichtplan Rotation - Anleitung"],
    [
      "Kurz gesagt",
      "Du bearbeitest nur das Blatt 'Rotation'. Dort steht, welche Mitarbeiter in welcher Musterwoche welche Schicht machen.",
    ],
    [
      "Wichtig",
      "Beim Import ersetzt diese Datei das komplette Rotationsmuster in der App. Der Wochenplan wird erst angepasst, wenn du in der App Plaene aus dem Muster generierst.",
    ],
    [],
    ["Was ist eine Schichtrotation?"],
    [
      "Rotation",
      "Die Rotation ist ein wiederholendes Muster. Bei einer Zykluslaenge von 4 gibt es Musterwoche 1, 2, 3 und 4. Danach beginnt wieder Musterwoche 1.",
    ],
    [
      "Musterwoche",
      "Eine Musterwoche ist keine feste Kalenderwoche. Sie beschreibt nur die Position im wiederholenden Zyklus.",
    ],
    [
      "Startwoche",
      `Die Startwoche legt fest, welche Kalenderwoche als Musterwoche 1 gilt. Aktuell: KW ${config.start_week}/${config.start_year}.`,
    ],
    [
      "Beispiel",
      `Bei Start KW ${config.start_week}/${config.start_year} und Zykluslaenge ${config.cycle_length} ist diese KW Musterwoche 1. Die naechste KW ist Musterwoche 2, bis der Zyklus wieder bei 1 beginnt.`,
    ],
    [
      "Generieren",
      "Wenn die App einen Plan aus dem Muster generiert, rechnet sie zuerst aus, welche Musterwoche fuer die Kalenderwoche gilt, und uebernimmt dann die Namen aus dieser Musterwoche.",
    ],
    [],
    [],
    ["So bearbeitest du die Datei"],
    ["1", "Oeffne das Blatt 'Rotation'."],
    [
      "2",
      "Passe oben Startjahr, Startwoche und Zykluslaenge an, falls der Rotationsstart geaendert werden soll.",
    ],
    [
      "3",
      "Trage unten in der Spalte 'Mitarbeiter' die Namen ein. Mehrere Namen werden mit Komma getrennt.",
    ],
    [
      "4",
      `Beispiel fuer eine Zelle: ${firstStaff}, ${secondStaff}`,
    ],
    [
      "5",
      "Lasse die Mitarbeiter-Zelle leer, wenn die Schicht in dieser Musterwoche frei bleiben soll.",
    ],
    [
      "6",
      "Schichtnamen bitte nicht aendern. Verwende exakt die Namen aus dem Blatt 'Schichten'.",
    ],
    [
      "7",
      "Speichere die Datei als .xlsx und lade sie wieder in der App hoch.",
    ],
    [],
    ["Was darf geaendert werden?"],
    ["Ja", "Startjahr, Startwoche, Zykluslaenge im Blatt 'Rotation'."],
    ["Ja", "Mitarbeiter-Namen in der Spalte 'Mitarbeiter (Komma getrennt)'."],
    ["Ja", "Weitere Zeilen mit vorhandenen Musterwochen und vorhandenen Schichten, falls du die Tabelle erweiterst."],
    ["Nein", "Blattname 'Rotation' und die Spaltenueberschriften."],
    ["Nein", "Schichtnamen, wenn sie nicht exakt so auch im Blatt 'Schichten' stehen."],
    ["Nein", "Mitarbeiter-Namen, wenn sie nicht exakt so auch im Blatt 'Mitarbeiter' stehen."],
    [],
    ["Beispiele"],
    ["Eine Person", `${firstStaff}`],
    ["Mehrere Personen", `${firstStaff}, ${secondStaff}`],
    ["Keine Person", "Zelle leer lassen"],
    ["Schichtzeile", `Musterwoche 1 | ${firstShift} | ${firstStaff}, ${secondStaff}`],
    ["Naechste Schicht", `Musterwoche 1 | ${secondShift} | ${secondStaff}`],
    [],
    ["Nachschlageblaetter"],
    [
      "Mitarbeiter",
      "Dieses Blatt zeigt alle aktiven Mitarbeiter, die in der Rotation verwendet werden koennen. Es ist nur zum Nachschlagen.",
    ],
    [
      "Schichten",
      "Dieses Blatt zeigt alle aktiven Schichten, die in der Rotation verwendet werden koennen. Es ist nur zum Nachschlagen.",
    ],
    [
      "IDs",
      "Interne IDs werden in dieser Vorlage bewusst nicht angezeigt. Du arbeitest nur mit lesbaren Namen.",
    ],
  ];
}

function parseConfig(rows: XlsxCellValue[][]): Omit<RotationConfig, "config_id"> {
  return {
    start_year: integerInRange(readCell(rows, 2, 1), "Startjahr", 2020, 2100),
    start_week: integerInRange(readCell(rows, 3, 1), "Startwoche", 1, 53),
    cycle_length: integerInRange(readCell(rows, 4, 1), "Zykluslaenge", 1, 52),
  };
}

function findHeaderColumns(rows: XlsxCellValue[][]): HeaderColumns {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const headers = (rows[rowIndex] || []).map((value) => normalizeHeader(toText(value)));
    const patternWeek = findHeader(headers, ["musterwoche"]);
    const shiftName = findHeader(headers, ["schicht"]);
    const staffNames = findHeader(headers, ["mitarbeiter"]);

    if (patternWeek !== -1 && shiftName !== -1 && staffNames !== -1) {
      const shiftId = findHeader(headers, ["schicht id"]);

      return {
        headerRow: rowIndex,
        patternWeek,
        shiftName,
        staffNames,
        ...(shiftId !== -1 && { shiftId }),
      };
    }
  }

  badRequest("Die Kopfzeile mit Musterwoche, Schicht und Mitarbeiter wurde nicht gefunden");
}

function resolveShift(options: {
  rowNumber: number;
  shiftIdValue: XlsxCellValue;
  shiftNameValue: XlsxCellValue;
  shiftsById: Map<number, Shift>;
  shiftsByName: Map<string, Shift[]>;
}): Shift {
  const shiftIdText = toText(options.shiftIdValue);

  if (shiftIdText !== "") {
    const shiftId = toInteger(options.shiftIdValue, `Schicht-ID in Zeile ${options.rowNumber}`);
    const shift = options.shiftsById.get(shiftId);

    if (!shift) {
      badRequest(`Schicht-ID ${shiftId} in Zeile ${options.rowNumber} ist unbekannt oder inaktiv`);
    }

    return shift;
  }

  const shiftName = toText(options.shiftNameValue);
  return resolveByName(options.shiftsByName, shiftName, "Schicht", options.rowNumber);
}

function resolveByName<T extends Staff | Shift>(
  lookup: Map<string, T[]>,
  name: string,
  label: string,
  rowNumber: number
): T {
  const normalized = normalizeName(name);

  if (!normalized) {
    badRequest(`${label} in Zeile ${rowNumber} fehlt`);
  }

  const matches = lookup.get(normalized) || [];

  if (matches.length === 0) {
    badRequest(`${label} '${name}' in Zeile ${rowNumber} ist unbekannt oder inaktiv`);
  }

  if (matches.length > 1) {
    badRequest(`${label} '${name}' in Zeile ${rowNumber} ist mehrfach vorhanden`);
  }

  return matches[0];
}

function makeNameLookup<T extends Staff | Shift>(items: T[], label: string): Map<string, T[]> {
  const lookup = new Map<string, T[]>();

  for (const item of items) {
    const key = normalizeName(item.name);
    const matches = lookup.get(key) || [];
    matches.push(item);
    lookup.set(key, matches);
  }

  for (const [name, matches] of lookup.entries()) {
    if (matches.length > 1) {
      const names = matches.map((item) => item.name).join(", ");
      console.warn(`[rotation-excel] ${label} '${name}' ist nicht eindeutig: ${names}`);
    }
  }

  return lookup;
}

function splitStaffNames(value: XlsxCellValue): string[] {
  return toText(value)
    .split(/[,;\n\r]+/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function readCell(rows: XlsxCellValue[][], rowIndex: number, colIndex: number): XlsxCellValue {
  return rows[rowIndex]?.[colIndex];
}

function integerInRange(value: XlsxCellValue, label: string, min: number, max: number): number {
  const number = toInteger(value, label);

  if (number < min || number > max) {
    badRequest(`${label} muss zwischen ${min} und ${max} liegen`);
  }

  return number;
}

function toInteger(value: XlsxCellValue, label: string): number {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  const text = toText(value);
  if (/^\d+$/.test(text)) {
    return Number(text);
  }

  badRequest(`${label} muss eine ganze Zahl sein`);
}

function findHeader(headers: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const exact = headers.findIndex((header) => header === candidate);
    if (exact !== -1) return exact;
  }

  for (const candidate of candidates) {
    const partial = headers.findIndex((header) => header.startsWith(`${candidate} `));
    if (partial !== -1) return partial;
  }

  return -1;
}

function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function toText(value: XlsxCellValue): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function badRequest(message: string): never {
  throw createError({
    statusCode: 400,
    statusMessage: message,
  });
}
