import type { MessageKey } from "~/server/lib/i18n/translate";
import { apiError, type ErrorParams, type MessageRef } from "~/server/utils/api-error";
import type { XlsxCellValue } from "~/server/utils/xlsx";

export function badRequest(key: MessageKey, params?: ErrorParams): never {
  throw apiError(null, 400, key, params);
}

// Trimmed long texts of the running import. A shared string may be referenced by every cell of a sheet,
// so it is trimmed once, not once per cell. Cleared around every import, so no file's text outlives it.
const LONG_TEXT = 256;
const longTexts = new Map<string, string>();

export function clearTextCache(): void {
  longTexts.clear();
}

export function toText(value: XlsxCellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string" || value.length <= LONG_TEXT) return String(value).trim();
  let text = longTexts.get(value);
  if (text === undefined) {
    text = value.trim();
    longTexts.set(value, text);
  }
  return text;
}

export function normalizeName(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function normalizeHeader(value: string): string {
  return (
    value
      .toLowerCase()
      // [^()]: with [^)] an unbalanced "(((…" made the scan quadratic.
      .replace(/\([^()]*\)/g, "")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
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
