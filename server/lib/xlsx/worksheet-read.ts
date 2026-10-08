import { columnNumberFromCellRef } from "./cell-ref";
import { MAX_WORKSHEET_COLUMNS, MAX_WORKSHEET_ROWS } from "./limits";
import type { XlsxCellValue } from "./types";
import { decodeXml, parseAttrs, parseTextRuns } from "./xml";

export function parseWorksheetRows(xml: string, sharedStrings: string[]): XlsxCellValue[][] {
  const rows: XlsxCellValue[][] = [];
  const rowRegex = /<row\b([^>]*)>([\s\S]*?)<\/row>/g;
  let rowMatch: RegExpExecArray | null;
  let fallbackRow = 1;
  let parsedRows = 0;

  while ((rowMatch = rowRegex.exec(xml)) !== null) {
    const rowAttrsXml = rowMatch[1];
    const rowXml = rowMatch[2];
    if (rowAttrsXml === undefined || rowXml === undefined) continue;

    const rowAttrs = parseAttrs(rowAttrsXml);
    const rowNumber = Number(rowAttrs.r || fallbackRow);
    if (!Number.isInteger(rowNumber) || rowNumber < 1 || rowNumber > MAX_WORKSHEET_ROWS) {
      throw new Error(`Die Excel-Datei enthält zu viele Zeilen in einem Arbeitsblatt`);
    }

    parsedRows++;
    if (parsedRows > MAX_WORKSHEET_ROWS) {
      throw new Error("Die Excel-Datei enthält zu viele Zeilen in einem Arbeitsblatt");
    }

    const row: XlsxCellValue[] = [];
    let fallbackCol = 1;
    const cellRegex = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
    let cellMatch: RegExpExecArray | null;

    while ((cellMatch = cellRegex.exec(rowXml)) !== null) {
      const cellAttrsXml = cellMatch[1];
      const cellXml = cellMatch[2];
      if (cellAttrsXml === undefined || cellXml === undefined) continue;

      const cellAttrs = parseAttrs(cellAttrsXml);
      const colNumber = cellAttrs.r ? columnNumberFromCellRef(cellAttrs.r) : fallbackCol;
      if (!Number.isInteger(colNumber) || colNumber < 1 || colNumber > MAX_WORKSHEET_COLUMNS) {
        throw new Error("Die Excel-Datei enthält zu viele Spalten in einem Arbeitsblatt");
      }
      row[colNumber - 1] = parseCellValue(cellXml, cellAttrs.t, sharedStrings);
      fallbackCol = colNumber + 1;
    }

    rows[rowNumber - 1] = row;
    fallbackRow = rowNumber + 1;
  }

  return rows.map((row) => row || []);
}

function parseCellValue(xml: string, type: string | undefined, sharedStrings: string[]): XlsxCellValue {
  if (type === "inlineStr") {
    return parseTextRuns(xml);
  }

  const valueMatch = xml.match(/<v\b[^>]*>([\s\S]*?)<\/v>/);
  if (!valueMatch) return "";

  const rawValue = valueMatch[1];
  if (rawValue === undefined) return "";

  const raw = decodeXml(rawValue);

  if (type === "s") {
    return sharedStrings[Number(raw)] || "";
  }

  if (type === "b") {
    return raw === "1";
  }

  if (type === "str") {
    return raw;
  }

  const numberValue = Number(raw);
  return Number.isFinite(numberValue) ? numberValue : raw;
}
