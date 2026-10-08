import { Buffer } from "node:buffer";
import {
  appPropsXml,
  contentTypesXml,
  corePropsXml,
  rootRelsXml,
  stylesXml,
  workbookRelsXml,
  workbookXml,
} from "./package-xml";
import type { XlsxSheet, XlsxWorkbook } from "./types";
import { worksheetXml } from "./worksheet-xml";
import { createZip, type ZipEntry } from "./zip-write";

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

function xmlBuffer(xml: string): Buffer {
  return Buffer.from(xml, "utf-8");
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
