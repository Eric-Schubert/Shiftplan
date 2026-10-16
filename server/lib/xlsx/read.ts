import { Buffer } from "node:buffer";
import { XlsxError } from "./error";
import { MAX_WORKSHEET_COUNT } from "./limits";
import type { XlsxSheet, XlsxWorkbook } from "./types";
import { checkedText, parseWorksheetRows } from "./worksheet-read";
import { parseAttrs, parseTextRuns } from "./xml";
import { xmlElements } from "./xml-scan";
import { readZip } from "./zip-read";

export function parseXlsx(buffer: Buffer): XlsxWorkbook {
  const zip = readZip(buffer);
  const workbook = readXml(zip, "xl/workbook.xml");
  const rels = readXml(zip, "xl/_rels/workbook.xml.rels");
  const sharedStrings = parseSharedStrings(zip.get("xl/sharedStrings.xml")?.toString("utf-8") || "");

  const relationships = parseRelationships(rels);
  const sheets: XlsxSheet[] = [];

  for (const sheet of xmlElements(workbook, "sheet")) {
    const attrs = parseAttrs(sheet.attrs);
    const name = attrs.name;
    const relId = attrs["r:id"];

    if (!name || !relId || !relationships.has(relId)) continue;

    const target = relationships.get(relId)!;
    const path = normalizeWorkbookTarget(target);
    const xml = readXml(zip, path);

    if (sheets.length >= MAX_WORKSHEET_COUNT) {
      throw new XlsxError("excel.file.tooManySheets");
    }

    sheets.push({
      name,
      rows: parseWorksheetRows(xml, sharedStrings),
    });
  }

  if (sheets.length === 0) {
    const firstSheet = zip.get("xl/worksheets/sheet1.xml");
    if (!firstSheet) {
      throw new XlsxError("excel.file.noSheets");
    }

    sheets.push({
      name: "Tabelle1",
      rows: parseWorksheetRows(firstSheet.toString("utf-8"), sharedStrings),
    });
  }

  return { sheets };
}

function readXml(zip: Map<string, Buffer>, path: string): string {
  const entry = zip.get(path);
  if (!entry) {
    throw new XlsxError("excel.file.incomplete", { path });
  }

  return entry.toString("utf-8");
}

function parseRelationships(xml: string): Map<string, string> {
  const relationships = new Map<string, string>();

  for (const relationship of xmlElements(xml, "Relationship")) {
    const attrs = parseAttrs(relationship.attrs);
    if (attrs.Id && attrs.Target) {
      relationships.set(attrs.Id, attrs.Target);
    }
  }

  return relationships;
}

function parseSharedStrings(xml: string): string[] {
  if (!xml) return [];

  const strings: string[] = [];
  for (const item of xmlElements(xml, "si")) {
    strings.push(checkedText(parseTextRuns(item.inner ?? "")));
  }

  return strings;
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
