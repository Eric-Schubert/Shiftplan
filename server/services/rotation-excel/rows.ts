import type { XlsxCellValue } from "~/server/utils/xlsx";
import type { RotationConfig } from "~/types/rotation";
import type { Shift } from "~/types/shift";
import type { Staff } from "~/types/staff";
import { badRequest, splitList, toInteger, toText } from "~/server/services/rotation-excel/cells";
import { resolveByName, resolveShift } from "~/server/services/rotation-excel/lookup";
import type { GridColumns, HeaderColumns } from "~/server/services/rotation-excel/sheet";

export type RotationExcelEntry = {
  pattern_week: number;
  staff_id: number;
  shift_id: number;
};

export type Lookups = {
  staffByName: Map<string, Staff[]>;
  shiftsByName: Map<string, Shift[]>;
  shiftsById: Map<number, Shift>;
};

export type ReadContext = {
  rows: XlsxCellValue[][];
  config: Omit<RotationConfig, "config_id">;
  lookups: Lookups;
  add: (entry: RotationExcelEntry) => void;
};

/** One row per person, the shift for each pattern week in its "Woche N" column. */
export function readGridRows({ rows, config, lookups, add }: ReadContext, grid: GridColumns): number {
  const seenWeeks = new Set<number>();

  for (const week of grid.weeks.values()) {
    if (week < 1 || week > config.cycle_length) {
      badRequest(
        `Die Spalte „Woche ${week}“ passt nicht zur Zykluslänge ${config.cycle_length}. Zykluslänge erhöhen oder die Spalte löschen.`
      );
    }
    if (seenWeeks.has(week)) {
      badRequest(`Die Spalte „Woche ${week}“ gibt es doppelt`);
    }
    seenWeeks.add(week);
  }

  for (let week = 1; week <= config.cycle_length; week++) {
    if (!seenWeeks.has(week)) {
      badRequest(
        `Die Spalte „Woche ${week}“ fehlt. Bei Zykluslänge ${config.cycle_length} braucht es die Spalten Woche 1 bis Woche ${config.cycle_length}.`
      );
    }
  }

  let importedRows = 0;

  for (let rowIndex = grid.headerRow + 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex] || [];
    const rowNumber = rowIndex + 1;
    const name = toText(row[grid.staffName]);

    if (!name) {
      if ([...grid.weeks.keys()].some((col) => toText(row[col]) !== "")) {
        badRequest(`In Zeile ${rowNumber} fehlt der Name in der Spalte „Mitarbeiter“`);
      }
      continue;
    }

    importedRows++;
    const staff = resolveByName(lookups.staffByName, name, "Mitarbeiter", `Zeile ${rowNumber}`);

    for (const [col, week] of grid.weeks) {
      for (const shiftName of splitList(row[col])) {
        const shift = resolveByName(
          lookups.shiftsByName,
          shiftName,
          "Schicht",
          `Zeile ${rowNumber}, Woche ${week}`
        );
        add({ pattern_week: week, staff_id: staff.staff_id, shift_id: shift.shift_id });
      }
    }
  }

  return importedRows;
}

/** Earlier template: one row per pattern week and shift, staff names comma-separated. */
export function readListRows({ rows, config, lookups, add }: ReadContext, columns: HeaderColumns): number {
  let importedRows = 0;

  for (let rowIndex = columns.headerRow + 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex] || [];
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
      shiftsById: lookups.shiftsById,
      shiftsByName: lookups.shiftsByName,
    });

    for (const staffName of splitList(row[columns.staffNames])) {
      const staff = resolveByName(lookups.staffByName, staffName, "Mitarbeiter", `Zeile ${rowNumber}`);
      add({ pattern_week: patternWeek, staff_id: staff.staff_id, shift_id: shift.shift_id });
    }
  }

  return importedRows;
}
