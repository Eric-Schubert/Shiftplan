export type { XlsxCellValue, XlsxSheet, XlsxWorkbook } from "~/server/lib/xlsx/types";
export { createXlsx } from "~/server/lib/xlsx/write";
export { parseXlsx } from "~/server/lib/xlsx/read";

const CONTENT_TYPES = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function xlsxContentType(): string {
  return CONTENT_TYPES;
}
