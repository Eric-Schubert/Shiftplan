import { cellRef } from "./cell-ref";
import { CELL_STYLE_IDS, DOC_REL_NS, MAIN_NS } from "./package-xml";
import type { XlsxCell, XlsxCellValue, XlsxListValidation, XlsxSheetInput } from "./types";
import { escapeXml } from "./xml";

/** `selected` marks the sheet Excel opens on; without it Excel may pick another tab. */
export function worksheetXml(sheet: XlsxSheetInput, selected = false): string {
  const rowCount = sheet.rows.length;
  const colCount = Math.max(1, ...sheet.rows.map((row) => row.length));
  const dimension = `A1:${cellRef(rowCount || 1, colCount)}`;
  const headerRows = new Set(sheet.headerRows || []);
  const cols = columnWidthsXml(sheet.columnWidths, colCount);
  const rows = sheet.rows
    .map((row, rowIndex) => rowXml(row, rowIndex + 1, headerRows.has(rowIndex + 1), sheet.rowHeights?.[rowIndex + 1]))
    .filter(Boolean)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="${MAIN_NS}" xmlns:r="${DOC_REL_NS}">
  <dimension ref="${dimension}"/>
  ${sheetViewsXml(sheet.freeze, selected)}
  ${cols}
  <sheetData>${rows}</sheetData>
  ${listValidationsXml(sheet.listValidations)}
</worksheet>`;
}

function sheetViewsXml(freeze: XlsxSheetInput["freeze"], selected: boolean): string {
  const view = `<sheetView${selected ? ' tabSelected="1"' : ""} workbookViewId="0"`;
  if (!freeze || (freeze.rows <= 0 && freeze.cols <= 0)) {
    return `<sheetViews>${view}/></sheetViews>`;
  }

  const topLeft = cellRef(freeze.rows + 1, freeze.cols + 1);
  const activePane = freeze.rows > 0 && freeze.cols > 0 ? "bottomRight" : freeze.rows > 0 ? "bottomLeft" : "topRight";
  const split = [freeze.cols > 0 ? `xSplit="${freeze.cols}"` : "", freeze.rows > 0 ? `ySplit="${freeze.rows}"` : ""].filter(Boolean).join(" ");

  return `<sheetViews>${view}><pane ${split} topLeftCell="${topLeft}" activePane="${activePane}" state="frozen"/><selection pane="${activePane}" activeCell="${topLeft}" sqref="${topLeft}"/></sheetView></sheetViews>`;
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

/** Warning instead of a hard stop, so a cell can still hold two shifts like "Früh, Spät". */
function listValidationsXml(validations: XlsxListValidation[] | undefined): string {
  if (!validations || validations.length === 0) return "";

  const items = validations
    .map((validation) => {
      const prompt = validation.prompt ? ` showInputMessage="1" prompt="${escapeXml(validation.prompt.slice(0, 255))}"` : "";
      const warning = validation.warning ? ` showErrorMessage="1" errorStyle="warning" error="${escapeXml(validation.warning.slice(0, 255))}"` : "";

      return `<dataValidation type="list" allowBlank="1"${prompt}${warning} sqref="${validation.range}"><formula1>${escapeXml(validation.source)}</formula1></dataValidation>`;
    })
    .join("");

  return `<dataValidations count="${validations.length}">${items}</dataValidations>`;
}

function rowXml(row: XlsxCell[], rowNumber: number, isHeader: boolean, height?: number): string {
  const cells = row
    .map((cell, index) => cellXml(cell, rowNumber, index + 1, isHeader))
    .filter(Boolean)
    .join("");
  const heightAttrs = height ? ` ht="${height}" customHeight="1"` : "";

  return cells ? `<row r="${rowNumber}"${heightAttrs}>${cells}</row>` : "";
}

function cellXml(cell: XlsxCell, rowNumber: number, colNumber: number, isHeader: boolean): string {
  const styled = typeof cell === "object" && cell !== null;
  const value: XlsxCellValue = styled ? cell.value : cell;
  const styleId = styled ? CELL_STYLE_IDS[cell.style] : isHeader ? CELL_STYLE_IDS.header : 0;
  const ref = cellRef(rowNumber, colNumber);
  const style = styleId ? ` s="${styleId}"` : "";

  // Styled empty cells are kept: the yellow input cells must show even when blank.
  if (value === null || value === undefined || value === "") {
    return styled ? `<c r="${ref}"${style}/>` : "";
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${ref}"${style}><v>${value}</v></c>`;
  }

  if (typeof value === "boolean") {
    return `<c r="${ref}" t="b"${style}><v>${value ? 1 : 0}</v></c>`;
  }

  const text = String(value);
  const space = text.trim() !== text || text.includes("\n") ? ' xml:space="preserve"' : "";
  return `<c r="${ref}" t="inlineStr"${style}><is><t${space}>${escapeXml(text)}</t></is></c>`;
}
