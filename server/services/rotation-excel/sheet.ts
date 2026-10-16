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
import { messageRef } from "~/server/utils/api-error";

export type HeaderColumns = {
  headerRow: number;
  patternWeek: number;
  shiftId?: number;
  shiftName: number;
  staffNames: number;
};

const CONFIG_LABELS = {
  start_year: ["startjahr"],
  start_week: ["startwoche"],
  cycle_length: ["zykluslänge", "zykluslaenge"],
};

/** Finds the value next to a label like "Startjahr" in column A, above the table header. */
function readConfigValue(rows: XlsxCellValue[][], headerRow: number, labels: string[]): XlsxCellValue {
  for (let rowIndex = 0; rowIndex < headerRow; rowIndex++) {
    const label = normalizeHeader(toText(readCell(rows, rowIndex, 0)));
    if (labels.includes(label)) return readCell(rows, rowIndex, 1);
  }

  return undefined;
}

export function parseConfig(
  rows: XlsxCellValue[][],
  headerRow: number
): Omit<RotationConfig, "config_id"> {
  const validation = getValidationConfig();
  const rotation = getRotationValidationConfig();

  return {
    start_year: integerInRange(
      readConfigValue(rows, headerRow, CONFIG_LABELS.start_year),
      messageRef("excel.labels.startYear"),
      validation.year.min,
      validation.year.max
    ),
    start_week: integerInRange(
      readConfigValue(rows, headerRow, CONFIG_LABELS.start_week),
      messageRef("excel.labels.startWeek"),
      validation.week.min,
      validation.week.max
    ),
    cycle_length: integerInRange(
      readConfigValue(rows, headerRow, CONFIG_LABELS.cycle_length),
      messageRef("excel.labels.cycleLength"),
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

export type GridColumns = {
  headerRow: number;
  staffName: number;
  /** Column index to pattern week, from headers like "Woche 2 (KW 43, 47)". */
  weeks: Map<number, number>;
};

/** The current template: one row per person, one "Woche N" column per pattern week. */
export function findGridColumns(rows: XlsxCellValue[][]): GridColumns | null {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const headers = (rows[rowIndex] || []).map((value) => normalizeHeader(toText(value)));
    const staffName = headers.findIndex((header) => header === "mitarbeiter");
    const weeks = new Map<number, number>();

    headers.forEach((header, colIndex) => {
      const match = header.match(/^woche (\d+)$/);
      if (match) weeks.set(colIndex, Number(match[1]));
    });

    if (staffName !== -1 && weeks.size > 0) {
      return { headerRow: rowIndex, staffName, weeks };
    }
  }

  return null;
}

/** The earlier template: one row per pattern week and shift with comma-separated names. */
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

  badRequest("excel.headerMissing");
}
