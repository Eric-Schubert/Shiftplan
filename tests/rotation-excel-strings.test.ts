import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { parseXlsx } from "~/server/lib/xlsx/read";
import { createZip } from "~/server/lib/xlsx/zip-write";
import { findGridColumns } from "~/server/services/rotation-excel/sheet";
import { readGridRows } from "~/server/services/rotation-excel/rows";
import { LIMIT_MS, randomText, timed } from "./helpers/crafted-xlsx";

describe("rotation import on long texts", () => {
  it("refuses a list text longer than any real list at once", () => {
    const rows = [
      ["Mitarbeiter", "Woche 1"],
      ["Anna", "frei, ".repeat(5_000)],
    ];
    const anna = { staff_id: 1, name: "Anna" };
    const context = {
      rows,
      config: { start_year: 2026, start_week: 1, cycle_length: 1 },
      lookups: { staffByName: new Map([["anna", [anna]]]), shiftsByName: new Map(), shiftsById: new Map() },
      add: () => undefined,
    } as unknown as Parameters<typeof readGridRows>[0];

    const { ms, error } = timed(() => readGridRows(context, findGridColumns(rows)!));

    expect((error as { data?: { code?: string } }).data?.code).toBe("excel.listTooLong");
    expect(ms).toBeLessThan(LIMIT_MS);
  });

  // V8 hashes strings longer than 16,383 characters by their length only, so a cache keyed by such texts collides.
  it("reads many long shared strings of one length in linear time", () => {
    const strings = Array.from({ length: 60 }, (_, i) => `${" ".repeat(32_766 - i)}\t${" ".repeat(i)}`);
    const shared = `<sst>${strings.map((text) => `<si><t xml:space="preserve">${text}</t></si>`).join("")}<si><t>Mitarbeiter</t></si><si><t>Woche 1</t></si></sst>`;
    const header = '<row><c t="s"><v>60</v></c><c t="s"><v>61</v></c></row>';
    const body = Array.from({ length: 8_000 }, (_, r) => `<row><c t="s"><v>${r % 60}</v></c><c t="s"><v>${r % 60}</v></c></row>`).join("");
    const xml = (text: string) => Buffer.from(text, "utf-8");
    const file = createZip([
      { path: "xl/workbook.xml", data: xml('<workbook><sheets><sheet name="Rotation" r:id="rId1"/></sheets></workbook>') },
      { path: "xl/_rels/workbook.xml.rels", data: xml('<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>') },
      { path: "xl/sharedStrings.xml", data: xml(shared + randomText(100_000)) },
      { path: "xl/worksheets/sheet1.xml", data: xml(`<worksheet><sheetData>${header}${body}</sheetData>${randomText(20_000)}</worksheet>`) },
    ]);
    const context = (rows: unknown[][]) =>
      ({
        rows,
        config: { start_year: 2026, start_week: 1, cycle_length: 1 },
        lookups: { staffByName: new Map(), shiftsByName: new Map(), shiftsById: new Map() },
        add: () => undefined,
      }) as unknown as Parameters<typeof readGridRows>[0];

    const { ms, error } = timed(() => {
      const rows = parseXlsx(file, { trimText: true }).sheets[0]!.rows;
      readGridRows(context(rows), findGridColumns(rows)!);
    });

    expect(error).toBeNull();
    expect(ms).toBeLessThan(LIMIT_MS);
  });
});
