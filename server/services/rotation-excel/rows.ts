import type { XlsxCellValue } from "~/server/utils/xlsx";
import type { RotationConfig } from "~/types/rotation";
import type { Shift } from "~/types/shift";
import type { Staff } from "~/types/staff";
import { badRequest, normalizeName, toInteger, toText } from "~/server/services/rotation-excel/cells";
import { FREE_MARKERS } from "~/server/services/rotation-excel/labels";
import { resolveByName, resolveShift } from "~/server/services/rotation-excel/lookup";
import { messageRef } from "~/server/utils/api-error";
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

const STAFF = messageRef("excel.labels.staff");

export type ReadContext = {
  rows: XlsxCellValue[][];
  config: Omit<RotationConfig, "config_id">;
  lookups: Lookups;
  add: (entry: RotationExcelEntry) => void;
};

/** Splits "Anna, Ben" or "Früh; Spät" into names; "-" and the free label of every locale ("frei") count as empty. */
function splitList(value: XlsxCellValue): string[] {
  return toText(value)
    .split(/[,;\n\r]+/)
    .map((name) => name.trim())
    .filter((name) => name !== "" && !FREE_MARKERS.has(normalizeName(name)));
}

/** One row per person, the shift for each pattern week in its "Woche N" column. */
export function readGridRows({ rows, config, lookups, add }: ReadContext, grid: GridColumns): number {
  const seenWeeks = new Set<number>();

  for (const week of grid.weeks.values()) {
    if (week < 1 || week > config.cycle_length) {
      badRequest("excel.weekColumnBeyondCycle", { week, cycle: config.cycle_length });
    }
    if (seenWeeks.has(week)) {
      badRequest("excel.weekColumnTwice", { week });
    }
    seenWeeks.add(week);
  }

  for (let week = 1; week <= config.cycle_length; week++) {
    if (!seenWeeks.has(week)) {
      badRequest("excel.weekColumnMissing", { week, cycle: config.cycle_length });
    }
  }

  let importedRows = 0;

  for (let rowIndex = grid.headerRow + 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex] || [];
    const rowNumber = rowIndex + 1;
    const name = toText(row[grid.staffName]);

    if (!name) {
      if ([...grid.weeks.keys()].some((col) => toText(row[col]) !== "")) {
        badRequest("excel.staffNameMissing", { row: rowNumber });
      }
      continue;
    }

    importedRows++;
    const staff = resolveByName(lookups.staffByName, name, STAFF, messageRef("excel.locations.row", { row: rowNumber }));

    for (const [col, week] of grid.weeks) {
      for (const shiftName of splitList(row[col])) {
        const location = messageRef("excel.locations.rowWeek", { row: rowNumber, week });
        const shift = resolveByName(lookups.shiftsByName, shiftName, messageRef("excel.labels.shift"), location);
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

    const patternWeekLabel = messageRef("excel.labels.patternWeekInRow", { row: rowNumber });
    const patternWeek = toInteger(row[columns.patternWeek], patternWeekLabel);
    if (patternWeek < 1 || patternWeek > config.cycle_length) {
      badRequest("excel.between", { label: patternWeekLabel, min: 1, max: config.cycle_length });
    }

    const shift = resolveShift({
      rowNumber,
      shiftIdValue: columns.shiftId !== undefined ? row[columns.shiftId] : undefined,
      shiftNameValue: row[columns.shiftName],
      shiftsById: lookups.shiftsById,
      shiftsByName: lookups.shiftsByName,
    });

    for (const staffName of splitList(row[columns.staffNames])) {
      const staff = resolveByName(lookups.staffByName, staffName, STAFF, messageRef("excel.locations.row", { row: rowNumber }));
      add({ pattern_week: patternWeek, staff_id: staff.staff_id, shift_id: shift.shift_id });
    }
  }

  return importedRows;
}
