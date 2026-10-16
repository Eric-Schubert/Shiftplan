import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { XlsxError } from "~/server/lib/xlsx/error";
import { parseXlsx } from "~/server/lib/xlsx/read";
import { parseWorksheetRows } from "~/server/lib/xlsx/worksheet-read";
import { parseAttrs } from "~/server/lib/xlsx/xml";
import { createZip } from "~/server/lib/xlsx/zip-write";
import { findGridColumns, findHeaderColumns } from "~/server/services/rotation-excel/sheet";
import { readGridRows } from "~/server/services/rotation-excel/rows";

// Crafted files that made the reader rescan the whole input per tag or cell (quadratic) and block
// the server for seconds to minutes. Each case has to finish well inside the limit.
const LIMIT_MS = 300;

function timed(run: () => unknown): { ms: number; error: unknown } {
  const start = performance.now();
  let error: unknown = null;
  try {
    run();
  } catch (caught) {
    error = caught;
  }
  return { ms: performance.now() - start, error };
}

/** Letters that do not compress much, so the zip stays under the expansion limit. */
function noise(length: number, seed = 7): string {
  let state = seed;
  return Array.from({ length }, () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return String.fromCharCode(97 + (state % 26));
  }).join("");
}

function workbookWithSheet(sheetXml: string): Buffer {
  const xml = (text: string) => Buffer.from(text, "utf-8");
  return createZip([
    { path: "xl/workbook.xml", data: xml('<workbook><sheets><sheet name="Rotation" r:id="rId1"/></sheets></workbook>') },
    { path: "xl/_rels/workbook.xml.rels", data: xml('<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>') },
    { path: "xl/worksheets/sheet1.xml", data: xml(sheetXml) },
  ]);
}

describe("xlsx reader on crafted input", () => {
  it("rejects a 140 KB file of unclosed rows at once", () => {
    const sheetXml = `<worksheet><sheetData>${Array.from({ length: 11_500 }, (_, index) => `<row ${noise(20, index)}`).join("")}</sheetData></worksheet>`;
    const file = workbookWithSheet(sheetXml);
    expect(file.length).toBeGreaterThan(130_000);

    const { ms, error } = timed(() => parseXlsx(file));

    expect(error).toBeInstanceOf(XlsxError);
    expect((error as XlsxError).key).toBe("excel.file.brokenXml");
    expect(ms).toBeLessThan(LIMIT_MS);
  });

  it("reads rows with many unclosed cells, values and long junk tags in linear time", () => {
    const junkTag = `<row r="1" ${noise(140_000)}></row>`;
    const unclosedCells = `<row r="1">${"<c><v>1".repeat(20_000)}</row>`;

    for (const xml of [junkTag, unclosedCells]) {
      const { ms } = timed(() => parseWorksheetRows(xml, []));
      expect(ms).toBeLessThan(LIMIT_MS);
    }
    expect(timed(() => parseAttrs(noise(140_000))).ms).toBeLessThan(LIMIT_MS);
  });

  it("rejects a cell with more text than Excel allows", () => {
    const xml = `<row r="1"><c r="A1" t="inlineStr"><is><t>${"x".repeat(32_768)}</t></is></c></row>`;
    expect(timed(() => parseWorksheetRows(xml, [])).error).toMatchObject({ key: "excel.file.cellTooLong" });
  });
});

describe("rotation import on crafted cells", () => {
  it("finds no header among thousands of cells of one long unbalanced text quickly", () => {
    const text = "(".repeat(30_000);
    const rows = Array.from({ length: 20 }, () => Array.from({ length: 100 }, () => text));

    const grid = timed(() => findGridColumns(rows));
    const list = timed(() => findHeaderColumns(rows));

    expect(grid.ms + list.ms).toBeLessThan(LIMIT_MS);
    expect((list.error as { data?: { code?: string } }).data?.code).toBe("excel.headerMissing");
  });

  it("splits one long list text only once, however many cells repeat it", () => {
    const free = "frei, ".repeat(5_000);
    const rows = [["Mitarbeiter", "Woche 1"], ...Array.from({ length: 5_000 }, () => ["Anna", free])];
    const anna = { staff_id: 1, name: "Anna" };
    const context = {
      rows,
      config: { start_year: 2026, start_week: 1, cycle_length: 1 },
      lookups: { staffByName: new Map([["anna", [anna]]]), shiftsByName: new Map(), shiftsById: new Map() },
      add: () => undefined,
    } as unknown as Parameters<typeof readGridRows>[0];

    const { ms, error } = timed(() => readGridRows(context, findGridColumns(rows)!));

    expect(error).toBeNull();
    expect(ms).toBeLessThan(LIMIT_MS);
  });
});
