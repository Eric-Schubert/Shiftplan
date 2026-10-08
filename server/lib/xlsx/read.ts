import { Buffer } from "node:buffer";
import { MAX_WORKSHEET_COUNT } from "./limits";
import type { XlsxSheet, XlsxWorkbook } from "./types";
import { parseWorksheetRows } from "./worksheet-read";
import { parseAttrs, parseTextRuns } from "./xml";
import { readZip } from "./zip-read";

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

function normalizeWorkbookTarget(target: string): string {
  if (target.startsWith("/")) {
    return target.slice(1);
  }

  if (target.startsWith("xl/")) {
    return target;
  }

  return `xl/${target}`;
}
