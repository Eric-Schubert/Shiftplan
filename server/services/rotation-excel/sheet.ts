import type { XlsxCellValue } from "~/server/utils/xlsx";
import { getRotationValidationConfig, getValidationConfig } from "~/server/config/domain-config";
import type { RotationConfig } from "~/types/rotation";
import {
  badRequest,
  integerInRange,
  normalizeHeader,
  readCell,
  toText,
} from "~/server/services/rotation-excel/cells";

export type HeaderColumns = {
  headerRow: number;
  patternWeek: number;
  shiftId?: number;
  shiftName: number;
  staffNames: number;
};

export function parseConfig(rows: XlsxCellValue[][]): Omit<RotationConfig, "config_id"> {
  const validation = getValidationConfig();
  const rotation = getRotationValidationConfig();

  return {
    start_year: integerInRange(
      readCell(rows, 2, 1),
      "Startjahr",
      validation.year.min,
      validation.year.max
    ),
    start_week: integerInRange(
      readCell(rows, 3, 1),
      "Startwoche",
      validation.week.min,
      validation.week.max
    ),
    cycle_length: integerInRange(
      readCell(rows, 4, 1),
      "Zykluslänge",
      rotation.cycleLengthMin,
      rotation.cycleLengthMax
    ),
  };
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

export function findHeaderColumns(rows: XlsxCellValue[][]): HeaderColumns {
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
