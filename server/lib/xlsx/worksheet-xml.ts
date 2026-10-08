import { cellRef } from "./cell-ref";
import { DOC_REL_NS, MAIN_NS } from "./package-xml";
import type { XlsxCellValue, XlsxSheet } from "./types";
import { escapeXml } from "./xml";

export function worksheetXml(sheet: XlsxSheet): string {
  const rowCount = sheet.rows.length;
  const colCount = Math.max(1, ...sheet.rows.map((row) => row.length));
  const dimension = `A1:${cellRef(rowCount || 1, colCount)}`;
  const headerRows = new Set(sheet.headerRows || []);
  const cols = columnWidthsXml(sheet.columnWidths, colCount);
  const rows = sheet.rows
    .map((row, rowIndex) => rowXml(row, rowIndex + 1, headerRows.has(rowIndex + 1)))
    .filter(Boolean)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="${MAIN_NS}" xmlns:r="${DOC_REL_NS}">
  <dimension ref="${dimension}"/>
  ${cols}
  <sheetData>${rows}</sheetData>
</worksheet>`;
}

function columnWidthsXml(widths: number[] | undefined, colCount: number): string {
  if (!widths || widths.length === 0) return "";

  const cols = Array.from({ length: colCount }, (_, index) => {
    const width = widths[index];
    if (!width) return "";

    return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
  })
    .filter(Boolean)
    .join("");

  return cols ? `<cols>${cols}</cols>` : "";
}

function rowXml(row: XlsxCellValue[], rowNumber: number, isHeader: boolean): string {
  const cells = row
    .map((value, index) => cellXml(value, rowNumber, index + 1, isHeader))
    .filter(Boolean)
    .join("");

  return cells ? `<row r="${rowNumber}">${cells}</row>` : "";
}

function cellXml(value: XlsxCellValue, rowNumber: number, colNumber: number, isHeader: boolean): string {
  if (value === null || value === undefined || value === "") return "";

  const ref = cellRef(rowNumber, colNumber);
  const style = isHeader ? ' s="1"' : "";

  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${ref}"${style}><v>${value}</v></c>`;
  }

  if (typeof value === "boolean") {
    return `<c r="${ref}" t="b"${style}><v>${value ? 1 : 0}</v></c>`;
  }

  const text = String(value);
  const space = text.trim() !== text ? ' xml:space="preserve"' : "";
  return `<c r="${ref}" t="inlineStr"${style}><is><t${space}>${escapeXml(text)}</t></is></c>`;
}
