import type { MessageKey } from "~/server/lib/i18n/translate";
import { apiError, type ErrorParams, type MessageRef } from "~/server/utils/api-error";
import type { XlsxCellValue } from "~/server/utils/xlsx";

export function badRequest(key: MessageKey, params?: ErrorParams): never {
  throw apiError(null, 400, key, params);
}

export function toText(value: XlsxCellValue): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function normalizeName(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** A header or label to compare with the catalog: as normalizeHeader, umlauts written „ae“, „oe“, „ue“. */
export function normalizeLabel(value: string): string {
  return normalizeHeader(value).replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
}

export function readCell(rows: XlsxCellValue[][], rowIndex: number, colIndex: number): XlsxCellValue {
  return rows[rowIndex]?.[colIndex];
}

export function toInteger(value: XlsxCellValue, label: MessageRef): number {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  const text = toText(value);
  if (/^\d+$/.test(text)) {
    return Number(text);
  }

  badRequest("excel.integer", { label });
}

export function integerInRange(value: XlsxCellValue, label: MessageRef, min: number, max: number): number {
  const number = toInteger(value, label);

  if (number < min || number > max) {
    badRequest("excel.between", { label, min, max });
  }

  return number;
}
