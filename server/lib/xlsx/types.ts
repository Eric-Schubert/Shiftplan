export type XlsxCellValue = string | number | boolean | null | undefined;

export interface XlsxSheet {
  name: string;
  rows: XlsxCellValue[][];
  headerRows?: number[];
  columnWidths?: number[];
}

export interface XlsxWorkbook {
  sheets: XlsxSheet[];
}
