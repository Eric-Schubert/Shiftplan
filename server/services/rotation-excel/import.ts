import { Buffer } from "node:buffer";
import { parseXlsx } from "~/server/utils/xlsx";
import { RotationService } from "~/server/services/rotation.service";
import { ShiftService } from "~/server/services/shift.service";
import { StaffService } from "~/server/services/staff.service";
import type { RotationConfig } from "~/types/rotation";
import {
  badRequest,
  normalizeName,
  splitStaffNames,
  toInteger,
  toText,
} from "~/server/services/rotation-excel/cells";
import { makeNameLookup, resolveByName, resolveShift } from "~/server/services/rotation-excel/lookup";
import { findHeaderColumns, parseConfig } from "~/server/services/rotation-excel/sheet";

type RotationExcelEntry = {
  pattern_week: number;
  staff_id: number;
  shift_id: number;
};

export type RotationExcelImportResult = {
  success: true;
  dryRun: boolean;
  config: RotationConfig;
  importedRows: number;
  importedAssignments: number;
};

/** Reads a filled template and replaces the pattern; with dryRun it only validates and counts. */
export function importRotationTemplate(
  fileData: Buffer,
  options: { dryRun?: boolean } = {}
): RotationExcelImportResult {
  const workbook = parseXlsx(fileData);
  const rotationSheet =
    workbook.sheets.find((sheet) => normalizeName(sheet.name) === "rotation") ||
    workbook.sheets[0];

  if (!rotationSheet) {
    badRequest("Die Excel-Datei enthält kein Arbeitsblatt");
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

  if (options.dryRun) {
    return {
      success: true,
      dryRun: true,
      config: { ...config, config_id: RotationService.getConfig().config_id },
      importedRows,
      importedAssignments: entries.length,
    };
  }

  const updatedPattern = RotationService.replacePattern(config, entries);

  return {
    success: true,
    dryRun: false,
    config: updatedPattern.config,
    importedRows,
    importedAssignments: entries.length,
  };
}
