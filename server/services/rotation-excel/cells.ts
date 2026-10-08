import type { XlsxCellValue } from "~/server/utils/xlsx";

export function badRequest(message: string): never {
  throw createError({
    statusCode: 400,
    statusMessage: message,
  });
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

export function readCell(rows: XlsxCellValue[][], rowIndex: number, colIndex: number): XlsxCellValue {
  return rows[rowIndex]?.[colIndex];
}

export function toInteger(value: XlsxCellValue, label: string): number {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  const text = toText(value);
  if (/^\d+$/.test(text)) {
    return Number(text);
  }

  badRequest(`${label} muss eine ganze Zahl sein`);
}

export function integerInRange(value: XlsxCellValue, label: string, min: number, max: number): number {
  const number = toInteger(value, label);

  if (number < min || number > max) {
    badRequest(`${label} muss zwischen ${min} und ${max} liegen`);
  }

  return number;
}

export function splitStaffNames(value: XlsxCellValue): string[] {
  return toText(value)
    .split(/[,;\n\r]+/)
    .map((name) => name.trim())
    .filter(Boolean);
}
