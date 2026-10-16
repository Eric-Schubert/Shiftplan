export type { XlsxCell, XlsxCellStyle, XlsxCellValue, XlsxSheet, XlsxSheetInput, XlsxWorkbook, XlsxWorkbookInput } from "~/server/lib/xlsx/types";
export { createXlsx } from "~/server/lib/xlsx/write";
export { parseXlsx } from "~/server/lib/xlsx/read";
export { XlsxError } from "~/server/lib/xlsx/error";

const CONTENT_TYPES = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function xlsxContentType(): string {
  return CONTENT_TYPES;
}
