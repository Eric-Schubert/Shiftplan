export type XlsxCellValue = string | number | boolean | null | undefined;

export type XlsxCellStyle = "header" | "headerWrap" | "title" | "hint" | "input" | "label";

export interface XlsxStyledCell {
  value: XlsxCellValue;
  style: XlsxCellStyle;
}

export type XlsxCell = XlsxCellValue | XlsxStyledCell;

/** Dropdown for a cell range, filled from another range such as `Schichten!$A$2:$A$5`. */
export interface XlsxListValidation {
  range: string;
  source: string;
  prompt?: string;
  warning?: string;
}

export interface XlsxSheet {
  name: string;
  rows: XlsxCellValue[][];
  headerRows?: number[];
  columnWidths?: number[];
}

export interface XlsxWorkbook {
  sheets: XlsxSheet[];
}

export interface XlsxSheetInput extends Omit<XlsxSheet, "rows"> {
  rows: XlsxCell[][];
  /** Row number (1-based) to height in points. */
  rowHeights?: Record<number, number>;
  /** Rows and columns that stay visible while scrolling. */
  freeze?: { rows: number; cols: number };
  listValidations?: XlsxListValidation[];
}

export interface XlsxWorkbookInput {
  sheets: XlsxSheetInput[];
}
