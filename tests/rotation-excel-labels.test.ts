import { describe, expect, it, vi } from "vitest";
import type { XlsxCell } from "../server/utils/xlsx";
import { RotationExcelService, createXlsx, db, useRotationExcelModules } from "./helpers/rotation-excel";

// A second locale with its own labels, as English will bring them: the import must take both.
const ENGLISH = vi.hoisted<Record<string, string>>(() => ({
  "excel.labels.staff": "Staff",
  "excel.labels.startYear": "Start year",
  "excel.labels.startWeek": "Start week",
  "excel.labels.cycleLength": "Cycle length",
  "excel.labels.week": "Week {week}",
  "excel.labels.free": "off",
  "excel.labels.patternWeek": "Pattern week",
  "excelTemplate.sheets.rotation": "Rota",
}));

vi.mock("~/i18n/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/i18n/config")>()),
  LOCALES: ["de", "en"],
}));
vi.mock("~/i18n/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~/i18n/server")>();
  const fill = (text: string, params: Record<string, unknown> = {}) => text.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name]));
  return {
    ...actual,
    t: (locale: string, key: string, params?: Record<string, string | number>) =>
      locale === "en" && ENGLISH[key] ? fill(ENGLISH[key], params) : actual.t(locale, key as never, params),
  };
});

/** The current layout with the given labels: start week 3/2026, two weeks, Anna and Ben. */
function gridFile(labels: { sheet: string; config: string[]; staff: string; weeks: string[] }, rows: XlsxCell[][]) {
  const [startYear, startWeek, cycleLength] = labels.config;
  return createXlsx({
    sheets: [
      { name: "Info", rows: [["Nothing to import here"]] },
      {
        name: labels.sheet,
        rows: [[startYear, 2026], [startWeek, 3], [cycleLength, 2], [], [labels.staff, ...labels.weeks], ...rows],
      },
    ],
  });
}

function assignments() {
  return db.prepare("SELECT pattern_week, staff_id, shift_id FROM rotation_pattern ORDER BY pattern_week, staff_id, shift_id").all();
}

const EXPECTED = [
  { pattern_week: 1, staff_id: 1, shift_id: 1 },
  { pattern_week: 2, staff_id: 2, shift_id: 2 },
];

describe("Rotation Excel import labels", () => {
  useRotationExcelModules();

  it("ignores case, spaces, brackets and hyphens, and takes „ae“ for „ä“", () => {
    const file = gridFile(
      {
        sheet: " ROTATION ",
        config: ["STARTJAHR", "  Startwoche ", "Zykluslaenge"],
        staff: "mitarbeiter (Name)",
        weeks: ["WOCHE  1\n(KW 3, 5)", "Woche-2"],
      },
      [
        ["Anna Becker", "Früh", "FREI"],
        ["Ben Wagner", "–", "Spät"],
      ]
    );

    expect(RotationExcelService.importTemplate(file)).toMatchObject({ importedRows: 2, importedAssignments: 2 });
    expect(assignments()).toEqual(EXPECTED);
  });

  it("reads the labels, sheet name and free marker of every locale", () => {
    const english = gridFile(
      {
        sheet: "Rota",
        config: ["Start year", "Start week", "Cycle length"],
        staff: "Staff",
        weeks: ["Week 1\n(CW 3, 5)", "Week 2\n(CW 4, 6)"],
      },
      [
        ["Anna Becker", "Früh", "off"],
        ["Ben Wagner", "frei", "Spät"],
      ]
    );

    expect(RotationExcelService.importTemplate(english)).toMatchObject({ importedRows: 2, importedAssignments: 2 });
    expect(assignments()).toEqual(EXPECTED);
  });

  it("keeps a shift that is named like a free word", () => {
    db.prepare(
      "INSERT INTO shifts (name, active, start_time, end_time, color, min_staff, sort_order) VALUES ('Off', 1, '08:00', '16:00', '#999999', 1, 3)"
    ).run();
    const labels = { sheet: "Rotation", config: ["Startjahr", "Startwoche", "Zykluslänge"], staff: "Mitarbeiter" };
    const file = gridFile({ ...labels, weeks: ["Woche 1", "Woche 2"] }, [
      ["Anna Becker", "Früh", "off"],
      ["Ben Wagner", "frei", "-"],
    ]);

    expect(RotationExcelService.importTemplate(file)).toMatchObject({ importedRows: 2, importedAssignments: 2 });
    expect(assignments()).toEqual([
      { pattern_week: 1, staff_id: 1, shift_id: 1 },
      { pattern_week: 2, staff_id: 1, shift_id: 3 },
    ]);
  });

  it("still reads a German template while another locale exists", () => {
    const template = RotationExcelService.createTemplate("de");

    expect(RotationExcelService.importTemplate(template, { dryRun: true })).toMatchObject({
      importedRows: 2,
      importedAssignments: 1,
      config: { cycle_length: 2, start_year: 2026, start_week: 1 },
    });
  });

  it("reads the earlier layout with labels of either locale mixed", () => {
    const file = createXlsx({
      sheets: [
        {
          name: "Rotation",
          rows: [
            ["Startjahr", 2026],
            ["Start week", 3],
            ["Zykluslänge", 2],
            ["Pattern week", "Schicht-ID", "Schicht", "Mitarbeiter (Komma getrennt)"],
            [1, 1, "", "Anna Becker"],
            [2, "", "Spät", "Ben Wagner; off"],
          ],
        },
      ],
    });

    expect(RotationExcelService.importTemplate(file)).toMatchObject({ importedRows: 2, importedAssignments: 2 });
    expect(assignments()).toEqual(EXPECTED);
  });
});
