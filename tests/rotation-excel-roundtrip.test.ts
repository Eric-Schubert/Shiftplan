import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { CELL_STYLE_IDS, stylesXml } from "~/server/lib/xlsx/package-xml";
import { decodeXml, escapeXml } from "~/server/lib/xlsx/xml";
import { RotationExcelService, createXlsx, db, parseXlsx, useRotationExcelModules } from "./helpers/rotation-excel";

function rejection(run: () => unknown) {
  try {
    run();
  } catch (error) {
    return error as { statusCode?: number; data?: { code?: string } };
  }
  throw new Error("expected an error");
}

describe("Excel files the import cannot read", () => {
  useRotationExcelModules();

  it("answers 400 with the reader's message, not 500", () => {
    // An end-of-directory record that points far behind the end of the file.
    const cutOff = Buffer.alloc(22);
    cutOff.writeUInt32LE(0x06054b50, 0);
    cutOff.writeUInt16LE(1, 10);
    cutOff.writeUInt32LE(1000, 16);

    for (const [file, code] of [
      [Buffer.from("not a zip at all"), "excel.file.notZip"],
      [cutOff, "excel.file.unreadable"],
    ] as const) {
      const error = rejection(() => RotationExcelService.importTemplate(file));
      expect(error.statusCode).toBe(400);
      expect(error.data?.code).toBe(code);
    }
  });

  it("refuses start week 53 in a 52-week year", () => {
    const file = createXlsx({
      sheets: [{ name: "Rotation", rows: [["Startjahr", 2027], ["Startwoche", 53], ["Zykluslänge", 1], [], ["Mitarbeiter", "Woche 1"]] }],
    });
    const error = rejection(() => RotationExcelService.importTemplate(file));
    expect(error.data?.code).toBe("excel.between");
  });
});

describe("Excel template round trip", () => {
  useRotationExcelModules();

  it("keeps shift and staff names with commas, semicolons or the free word", () => {
    const addShift = db.prepare("INSERT INTO shifts (name, active, start_time, end_time, sort_order) VALUES (?, 1, '22:00', '06:00', ?)");
    addShift.run("Nacht, lang", 3);
    addShift.run("Früh; kurz", 4);
    addShift.run("frei", 5);
    db.prepare("UPDATE staff SET name = 'Wagner, Ben' WHERE staff_id = 2").run();
    db.prepare("DELETE FROM rotation_pattern").run();
    const pattern = db.prepare("INSERT INTO rotation_pattern (pattern_week, staff_id, shift_id) VALUES (?, ?, ?)");
    pattern.run(1, 1, 3);
    pattern.run(1, 1, 4);
    pattern.run(2, 2, 5);
    pattern.run(2, 2, 1);
    const before = db.prepare("SELECT pattern_week, staff_id, shift_id FROM rotation_pattern ORDER BY 1, 2, 3").all();

    const result = RotationExcelService.importTemplate(RotationExcelService.createTemplate());

    expect(result.importedAssignments).toBe(4);
    expect(db.prepare("SELECT pattern_week, staff_id, shift_id FROM rotation_pattern ORDER BY 1, 2, 3").all()).toEqual(before);
  });

  it("formats input cells as text, so Excel keeps names like 01 or 6:00", () => {
    const inputStyle = stylesXml()
      .match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/)![1]!
      .match(/<xf [^>]*>/g)![CELL_STYLE_IDS.input];
    expect(inputStyle).toContain('numFmtId="49"');
    expect(inputStyle).toContain('applyNumberFormat="1"');
  });

  it("drops characters XML does not allow, so the file opens", () => {
    expect(escapeXml("Anna\u000bBecker\u0000 \ud800& 😀")).toBe("AnnaBecker &amp; 😀");

    const file = createXlsx({ sheets: [{ name: "Liste", rows: [["Anna\u000bBecker", "Tab\tok"]] }] });
    expect(parseXlsx(file).sheets[0]!.rows[0]).toEqual(["AnnaBecker", "Tab\tok"]);
  });

  it("reads a character reference beyond Unicode as a replacement character instead of throwing", () => {
    expect(decodeXml("a&#99999999;b&#x110000;c&#228;")).toBe("a\ufffdb\ufffdcä");
  });
});
