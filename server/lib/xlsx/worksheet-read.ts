import { columnNumberFromCellRef } from "./cell-ref";
import { XlsxError } from "./error";
import { MAX_CELL_TEXT_LENGTH, MAX_WORKSHEET_COLUMNS, MAX_WORKSHEET_ROWS } from "./limits";
import type { XlsxCellValue } from "./types";
import { decodeXml, parseAttrs, parseTextRuns } from "./xml";
import { firstXmlElement, xmlElements } from "./xml-scan";

export function parseWorksheetRows(xml: string, sharedStrings: string[]): XlsxCellValue[][] {
  const rows: XlsxCellValue[][] = [];
  let fallbackRow = 1;
  let parsedRows = 0;

  // Excel writes empty but formatted rows and cells self-closing, e.g. <c r="B8" s="5"/>.
  for (const rowElement of xmlElements(xml, "row")) {
    const rowAttrs = parseAttrs(rowElement.attrs);
    const rowNumber = Number(rowAttrs.r || fallbackRow);
    if (!Number.isInteger(rowNumber) || rowNumber < 1 || rowNumber > MAX_WORKSHEET_ROWS) {
      throw new XlsxError("excel.file.tooManyRows");
    }

    parsedRows++;
    if (parsedRows > MAX_WORKSHEET_ROWS) {
      throw new XlsxError("excel.file.tooManyRows");
    }

    const row: XlsxCellValue[] = [];
    let fallbackCol = 1;

    for (const cellElement of xmlElements(rowElement.inner ?? "", "c")) {
      const cellAttrs = parseAttrs(cellElement.attrs);
      const colNumber = cellAttrs.r ? columnNumberFromCellRef(cellAttrs.r) : fallbackCol;
      if (!Number.isInteger(colNumber) || colNumber < 1 || colNumber > MAX_WORKSHEET_COLUMNS) {
        throw new XlsxError("excel.file.tooManyColumns");
      }
      row[colNumber - 1] = parseCellValue(cellElement.inner ?? "", cellAttrs.t, sharedStrings);
      fallbackCol = colNumber + 1;
    }

    rows[rowNumber - 1] = row;
    fallbackRow = rowNumber + 1;
  }

  return rows.map((row) => row || []);
}

/** Text as long as Excel allows in a cell at most; longer text only comes from a crafted file. */
export function checkedText(text: string): string {
  if (text.length > MAX_CELL_TEXT_LENGTH) throw new XlsxError("excel.file.cellTooLong");
  return text;
}

function parseCellValue(xml: string, type: string | undefined, sharedStrings: string[]): XlsxCellValue {
  if (type === "inlineStr") {
    return checkedText(parseTextRuns(xml));
  }

  const rawValue = firstXmlElement(xml, "v")?.inner;
  if (rawValue === undefined || rawValue === null) return "";

  const raw = decodeXml(rawValue);

  if (type === "s") {
    return sharedStrings[Number(raw)] || "";
  }

  if (type === "b") {
    return raw === "1";
  }

  if (type === "str") {
    return checkedText(raw);
  }

  const numberValue = Number(raw);
  return Number.isFinite(numberValue) ? numberValue : checkedText(raw);
}
