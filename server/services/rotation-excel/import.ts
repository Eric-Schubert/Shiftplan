import { Buffer } from "node:buffer";
import { parseXlsx } from "~/server/utils/xlsx";
import { RotationService } from "~/server/services/rotation.service";
import { ShiftService } from "~/server/services/shift.service";
import { StaffService } from "~/server/services/staff.service";
import type { RotationConfig } from "~/types/rotation";
import { badRequest, normalizeName } from "~/server/services/rotation-excel/cells";
import { ROTATION_SHEET_NAMES } from "~/server/services/rotation-excel/labels";
import { makeNameLookup } from "~/server/services/rotation-excel/lookup";
import {
  readGridRows,
  readListRows,
  type Lookups,
  type ReadContext,
  type RotationExcelEntry,
} from "~/server/services/rotation-excel/rows";
import { findGridColumns, findHeaderColumns, parseConfig } from "~/server/services/rotation-excel/sheet";

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
    workbook.sheets.find((sheet) => ROTATION_SHEET_NAMES.includes(normalizeName(sheet.name))) ||
    workbook.sheets[0];

  if (!rotationSheet) {
    badRequest("excel.noSheet");
  }

  const rows = rotationSheet.rows;
  const grid = findGridColumns(rows);
  const list = grid ? null : findHeaderColumns(rows);
  const config = parseConfig(rows, grid?.headerRow ?? list!.headerRow);
  const activeShifts = ShiftService.getActive();
  const lookups: Lookups = {
    staffByName: makeNameLookup(StaffService.getActive(), "staff"),
    shiftsByName: makeNameLookup(activeShifts, "shifts"),
    shiftsById: new Map(activeShifts.map((shift) => [shift.shift_id, shift])),
  };
  const entries: RotationExcelEntry[] = [];
  const seenAssignments = new Set<string>();
  const context: ReadContext = {
    rows,
    config,
    lookups,
    add(entry) {
      const key = `${entry.pattern_week}:${entry.staff_id}:${entry.shift_id}`;
      if (seenAssignments.has(key)) return;
      seenAssignments.add(key);
      entries.push(entry);
    },
  };

  const importedRows = grid ? readGridRows(context, grid) : readListRows(context, list!);

  if (importedRows === 0) {
    badRequest("excel.noRows");
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
