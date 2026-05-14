import { Buffer } from "node:buffer";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import { getXlsxConfig } from "~/server/config/domain-config";

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

type ZipEntry = {
  path: string;
  data: Buffer;
};

type ParsedZipEntry = {
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
};

const CONTENT_TYPES = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const DOC_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const XLSX_LIMITS = getXlsxConfig();
const MAX_ZIP_ENTRY_COUNT = XLSX_LIMITS.maxZipEntryCount;
const MAX_ZIP_ENTRY_UNCOMPRESSED_SIZE = XLSX_LIMITS.maxZipEntryUncompressedBytes;
const MAX_ZIP_TOTAL_UNCOMPRESSED_SIZE = XLSX_LIMITS.maxZipTotalUncompressedBytes;
const MAX_ZIP_EXPANSION_RATIO = XLSX_LIMITS.maxZipExpansionRatio;
const MAX_WORKSHEET_COUNT = XLSX_LIMITS.maxWorksheetCount;
const MAX_WORKSHEET_ROWS = XLSX_LIMITS.maxWorksheetRows;
const MAX_WORKSHEET_COLUMNS = XLSX_LIMITS.maxWorksheetColumns;

const CRC_TABLE = new Uint32Array(256);

for (let i = 0; i < CRC_TABLE.length; i++) {
  let crc = i;
  for (let j = 0; j < 8; j++) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  CRC_TABLE[i] = crc >>> 0;
}

export function createXlsx(workbook: XlsxWorkbook): Buffer {
  if (workbook.sheets.length === 0) {
    throw new Error("Workbook needs at least one sheet");
  }

  const sheets = makeUniqueSheetNames(workbook.sheets);
  const entries: ZipEntry[] = [
    {
      path: "[Content_Types].xml",
      data: xmlBuffer(contentTypesXml(sheets.length)),
    },
    {
      path: "_rels/.rels",
      data: xmlBuffer(rootRelsXml()),
    },
    {
      path: "docProps/core.xml",
      data: xmlBuffer(corePropsXml()),
    },
    {
      path: "docProps/app.xml",
      data: xmlBuffer(appPropsXml()),
    },
    {
      path: "xl/workbook.xml",
      data: xmlBuffer(workbookXml(sheets.map((sheet) => sheet.name))),
    },
    {
      path: "xl/_rels/workbook.xml.rels",
      data: xmlBuffer(workbookRelsXml(sheets.length)),
    },
    {
      path: "xl/styles.xml",
      data: xmlBuffer(stylesXml()),
    },
  ];

  for (const [index, sheet] of sheets.entries()) {
    entries.push({
      path: `xl/worksheets/sheet${index + 1}.xml`,
      data: xmlBuffer(worksheetXml(sheet)),
    });
  }

  return createZip(entries);
}

export function parseXlsx(buffer: Buffer): XlsxWorkbook {
  const zip = readZip(buffer);
  const workbook = readXml(zip, "xl/workbook.xml");
  const rels = readXml(zip, "xl/_rels/workbook.xml.rels");
  const sharedStrings = parseSharedStrings(zip.get("xl/sharedStrings.xml")?.toString("utf-8") || "");

  const relationships = parseRelationships(rels);
  const sheets: XlsxSheet[] = [];
  const sheetRegex = /<sheet\b([^>]*)\/?>/g;
  let sheetMatch: RegExpExecArray | null;

  while ((sheetMatch = sheetRegex.exec(workbook)) !== null) {
    const sheetAttrs = sheetMatch[1];
    if (!sheetAttrs) continue;

    const attrs = parseAttrs(sheetAttrs);
    const name = attrs.name;
    const relId = attrs["r:id"];

    if (!name || !relId || !relationships.has(relId)) continue;

    const target = relationships.get(relId)!;
    const path = normalizeWorkbookTarget(target);
    const xml = readXml(zip, path);

    if (sheets.length >= MAX_WORKSHEET_COUNT) {
      throw new Error("Die Excel-Datei enthält zu viele Arbeitsblätter");
    }

    sheets.push({
      name,
      rows: parseWorksheetRows(xml, sharedStrings),
    });
  }

  if (sheets.length === 0) {
    const firstSheet = zip.get("xl/worksheets/sheet1.xml");
    if (!firstSheet) {
      throw new Error("Keine Arbeitsblaetter in der Excel-Datei gefunden");
    }

    sheets.push({
      name: "Tabelle1",
      rows: parseWorksheetRows(firstSheet.toString("utf-8"), sharedStrings),
    });
  }

  return { sheets };
}

export function xlsxContentType(): string {
  return CONTENT_TYPES;
}

function xmlBuffer(xml: string): Buffer {
  return Buffer.from(xml, "utf-8");
}

function contentTypesXml(sheetCount: number): string {
  const sheets = Array.from({ length: sheetCount }, (_, index) => {
    return `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  ${sheets}
</Types>`;
}

function rootRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${REL_NS}">
  <Relationship Id="rId1" Type="${DOC_REL_NS}/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="${DOC_REL_NS}/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function workbookXml(sheetNames: string[]): string {
  const sheets = sheetNames
    .map((name, index) => {
      return `<sheet name="${escapeXml(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="${MAIN_NS}" xmlns:r="${DOC_REL_NS}">
  <workbookPr date1904="false"/>
  <sheets>${sheets}</sheets>
</workbook>`;
}

function workbookRelsXml(sheetCount: number): string {
  const sheets = Array.from({ length: sheetCount }, (_, index) => {
    return `<Relationship Id="rId${index + 1}" Type="${DOC_REL_NS}/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${REL_NS}">
  ${sheets}
  <Relationship Id="rIdStyles" Type="${DOC_REL_NS}/styles" Target="styles.xml"/>
</Relationships>`;
}

function corePropsXml(): string {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>Schichtplaner</dc:creator>
  <cp:lastModifiedBy>Schichtplaner</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
}

function appPropsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Schichtplaner</Application>
</Properties>`;
}

function stylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="${MAIN_NS}">
  <fonts count="2">
    <font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF2563EB"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1">
    <border><left/><right/><top/><bottom/><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;
}

function worksheetXml(sheet: XlsxSheet): string {
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

function createZip(entries: ZipEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.path, "utf-8");
    const compressed = deflateRawSync(entry.data);
    const crc = crc32(entry.data);
    const local = Buffer.alloc(30);

    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);

    localParts.push(local, name, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);

    centralParts.push(central, name);
    offset += local.length + name.length + compressed.length;
  }

  const centralOffset = offset;
  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);

  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(centralOffset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

function readZip(buffer: Buffer): Map<string, Buffer> {
  const entries = new Map<string, Buffer>();
  const eocdOffset = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let centralOffset = buffer.readUInt32LE(eocdOffset + 16);
  let totalUncompressedSize = 0;

  if (entryCount > MAX_ZIP_ENTRY_COUNT) {
    throw new Error("Die Excel-Datei enthält zu viele ZIP-Einträge");
  }

  for (let i = 0; i < entryCount; i++) {
    if (buffer.readUInt32LE(centralOffset) !== 0x02014b50) {
      throw new Error("Ungültige Excel-Datei: ZIP-Zentralverzeichnis defekt");
    }

    const entry = readCentralEntry(buffer, centralOffset);
    const nameLength = buffer.readUInt16LE(centralOffset + 28);
    const extraLength = buffer.readUInt16LE(centralOffset + 30);
    const commentLength = buffer.readUInt16LE(centralOffset + 32);
    const name = buffer.subarray(centralOffset + 46, centralOffset + 46 + nameLength).toString("utf-8");
    totalUncompressedSize = validateZipEntry(name, entry, totalUncompressedSize);

    entries.set(name.replace(/\\/g, "/"), readLocalEntry(buffer, entry));
    centralOffset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

function readCentralEntry(buffer: Buffer, offset: number): ParsedZipEntry {
  const flags = buffer.readUInt16LE(offset + 8);

  if (flags % 2 === 1) {
    throw new Error("Passwortgeschützte Excel-Dateien können nicht importiert werden");
  }

  const compressedSize = buffer.readUInt32LE(offset + 20);
  const uncompressedSize = buffer.readUInt32LE(offset + 24);

  if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff) {
    throw new Error("ZIP64 Excel-Dateien werden nicht unterstützt");
  }

  return {
    method: buffer.readUInt16LE(offset + 10),
    compressedSize,
    uncompressedSize,
    localHeaderOffset: buffer.readUInt32LE(offset + 42),
  };
}

function readLocalEntry(buffer: Buffer, entry: ParsedZipEntry): Buffer {
  const offset = entry.localHeaderOffset;

  if (buffer.readUInt32LE(offset) !== 0x04034b50) {
    throw new Error("Ungültige Excel-Datei: lokaler ZIP-Header defekt");
  }

  const nameLength = buffer.readUInt16LE(offset + 26);
  const extraLength = buffer.readUInt16LE(offset + 28);
  const dataOffset = offset + 30 + nameLength + extraLength;
  if (dataOffset + entry.compressedSize > buffer.length) {
    throw new Error("Ungültige Excel-Datei: ZIP-Daten abgeschnitten");
  }
  const data = buffer.subarray(dataOffset, dataOffset + entry.compressedSize);

  if (entry.method === 0) {
    if (data.length !== entry.uncompressedSize) {
      throw new Error("Ungültige Excel-Datei: ZIP-Größe passt nicht zum Inhalt");
    }
    return data;
  }

  if (entry.method === 8) {
    let inflated: Buffer;
    try {
      inflated = inflateRawSync(data, {
        maxOutputLength: Math.max(1, entry.uncompressedSize),
      });
    } catch (error) {
      throw new Error("Die Excel-Datei enthält ungültige oder zu große ZIP-Daten");
    }

    if (inflated.length !== entry.uncompressedSize) {
      throw new Error("Ungültige Excel-Datei: ZIP-Größe passt nicht zum Inhalt");
    }
    return inflated;
  }

  throw new Error(`ZIP-Kompressionsmethode ${entry.method} wird nicht unterstützt`);
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  const min = Math.max(0, buffer.length - 65557);

  for (let offset = buffer.length - 22; offset >= min; offset--) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      return offset;
    }
  }

  throw new Error("Keine gültige Excel-Datei: ZIP-Ende nicht gefunden");
}

function readXml(zip: Map<string, Buffer>, path: string): string {
  const entry = zip.get(path);
  if (!entry) {
    throw new Error(`Excel-Datei ist unvollständig: ${path} fehlt`);
  }

  return entry.toString("utf-8");
}

function parseRelationships(xml: string): Map<string, string> {
  const relationships = new Map<string, string>();
  const regex = /<Relationship\b([^>]*)\/?>/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(xml)) !== null) {
    const relAttrs = match[1];
    if (!relAttrs) continue;

    const attrs = parseAttrs(relAttrs);
    if (attrs.Id && attrs.Target) {
      relationships.set(attrs.Id, attrs.Target);
    }
  }

  return relationships;
}

function parseSharedStrings(xml: string): string[] {
  if (!xml) return [];

  const strings: string[] = [];
  const regex = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(xml)) !== null) {
    const itemXml = match[1];
    if (itemXml !== undefined) {
      strings.push(parseTextRuns(itemXml));
    }
  }

  return strings;
}

function parseWorksheetRows(xml: string, sharedStrings: string[]): XlsxCellValue[][] {
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

function validateZipEntry(
  name: string,
  entry: ParsedZipEntry,
  totalUncompressedSize: number
): number {
  if (entry.uncompressedSize > MAX_ZIP_ENTRY_UNCOMPRESSED_SIZE) {
    throw new Error(`ZIP-Eintrag '${name}' ist zu groß für den Excel-Import`);
  }

  const nextTotalSize = totalUncompressedSize + entry.uncompressedSize;
  if (nextTotalSize > MAX_ZIP_TOTAL_UNCOMPRESSED_SIZE) {
    throw new Error("Die entpackte Excel-Datei ist zu groß für den Import");
  }

  if (entry.method === 8) {
    if (entry.compressedSize === 0 && entry.uncompressedSize > 0) {
      throw new Error(`ZIP-Eintrag '${name}' ist ungültig`);
    }

    if (
      entry.compressedSize > 0 &&
      entry.uncompressedSize / entry.compressedSize > MAX_ZIP_EXPANSION_RATIO
    ) {
      throw new Error(`ZIP-Eintrag '${name}' expandiert zu stark für den Excel-Import`);
    }
  }

  return nextTotalSize;
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

function parseTextRuns(xml: string): string {
  const texts: string[] = [];
  const regex = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(xml)) !== null) {
    const text = match[1];
    if (text !== undefined) {
      texts.push(decodeXml(text));
    }
  }

  return texts.join("");
}

function parseAttrs(input: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const regex = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    const name = match[1];
    if (!name) continue;

    attrs[name] = decodeXml(match[2] ?? match[3] ?? "");
  }

  return attrs;
}

function normalizeWorkbookTarget(target: string): string {
  if (target.startsWith("/")) {
    return target.slice(1);
  }

  if (target.startsWith("xl/")) {
    return target;
  }

  return `xl/${target}`;
}

function makeUniqueSheetNames(sheets: XlsxSheet[]): XlsxSheet[] {
  const used = new Set<string>();

  return sheets.map((sheet, index) => {
    const base = sanitizeSheetName(sheet.name || `Tabelle${index + 1}`);
    let name = base;
    let suffix = 2;

    while (used.has(name.toLowerCase())) {
      const suffixText = ` ${suffix}`;
      name = `${base.slice(0, 31 - suffixText.length)}${suffixText}`;
      suffix++;
    }

    used.add(name.toLowerCase());
    return { ...sheet, name };
  });
}

function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[\\/?*:[\]]/g, " ").trim() || "Tabelle";
  return cleaned.slice(0, 31);
}

function cellRef(rowNumber: number, colNumber: number): string {
  return `${columnName(colNumber)}${rowNumber}`;
}

function columnName(colNumber: number): string {
  let name = "";
  let value = colNumber;

  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }

  return name;
}

function columnNumberFromCellRef(ref: string): number {
  const letters = ref.match(/[A-Z]+/i)?.[0].toUpperCase() || "A";
  let number = 0;

  for (const letter of letters) {
    number = number * 26 + (letter.charCodeAt(0) - 64);
  }

  return number;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, "&");
}

function crc32(data: Buffer): number {
  let crc = 0xffffffff;

  for (const byte of data) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}
