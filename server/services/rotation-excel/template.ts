import { Buffer } from "node:buffer";
import { createXlsx, type XlsxCell } from "~/server/utils/xlsx";
import { RotationService } from "~/server/services/rotation.service";
import { ShiftService } from "~/server/services/shift.service";
import { StaffService } from "~/server/services/staff.service";
import { calculatePatternWeek } from "~/server/services/rotation/weeks";
import {
  currentIsoWeek,
  formatCalendarWeeks,
  upcomingCalendarWeeks,
} from "~/server/services/rotation-excel/calendar";
import { shiftDropdown } from "~/server/services/rotation-excel/dropdown";
import { createInstructionRows } from "~/server/services/rotation-excel/instructions";

const SHIFTS_SHEET = "Schichten";
const CALENDAR_WEEKS_SHOWN = 3;
/** Title, hint, three config rows, a spacer row, then the header with "Woche 1", "Woche 2", ... */
const HEADER_ROW = 7;

/** One row per active staff member, one column per pattern week, the shift name in each cell. */
export function createRotationTemplate(): Buffer {
  const pattern = RotationService.getFullPattern();
  const { config } = pattern;
  const staff = StaffService.getActive();
  const shifts = ShiftService.getActive();
  const calendarWeeks = upcomingCalendarWeeks(config, CALENDAR_WEEKS_SHOWN);
  const thisWeek = currentIsoWeek();
  const current = { week: thisWeek, patternWeek: calculatePatternWeek(thisWeek.year, thisWeek.week) };
  const weeks = pattern.weeks.map((week) => week.pattern_week);
  const shiftsByCell = new Map<string, string[]>();

  for (const week of pattern.weeks) {
    for (const assignment of week.assignments) {
      for (const member of assignment.staff) {
        const key = `${week.pattern_week}:${member.staff_id}`;
        shiftsByCell.set(key, [...(shiftsByCell.get(key) || []), assignment.shift.name]);
      }
    }
  }

  const cellValue = (week: number, staffId: number) =>
    (shiftsByCell.get(`${week}:${staffId}`) || []).join(", ");

  const staffRows: XlsxCell[][] = staff.map((entry) => [
    { value: entry.name, style: "label" },
    ...weeks.map((week): XlsxCell => ({ value: cellValue(week, entry.staff_id), style: "input" })),
  ]);

  const rotationRows: XlsxCell[][] = [
    [{ value: "Rotation: Wer arbeitet in welcher Woche welche Schicht?", style: "title" }],
    [
      {
        value:
          "Gelbe Zellen ausfüllen: Zelle anklicken und über den kleinen Pfeil die Schicht wählen. Leer lassen = frei. Mehr dazu im Blatt „Anleitung“.",
        style: "hint",
      },
    ],
    [
      { value: "Startjahr", style: "label" },
      config.start_year,
      { value: "Jahr, in dem Woche 1 zum ersten Mal gilt", style: "hint" },
    ],
    [
      { value: "Startwoche", style: "label" },
      config.start_week,
      { value: "Kalenderwoche, in der Woche 1 zum ersten Mal gilt", style: "hint" },
    ],
    [
      { value: "Zykluslänge", style: "label" },
      config.cycle_length,
      { value: "Nach so vielen Wochen beginnt der Plan wieder bei Woche 1", style: "hint" },
    ],
    [
      {
        value:
          staff.length === 0
            ? "Noch keine aktiven Mitarbeitenden. Lege sie zuerst in der App an."
            : `Gerade (KW ${thisWeek.week}/${thisWeek.year}) läuft Woche ${current.patternWeek}.`,
        style: "hint",
      },
    ],
    [
      { value: "Mitarbeiter", style: "headerWrap" },
      ...weeks.map(
        (week): XlsxCell => ({
          value: `Woche ${week}\n(${formatCalendarWeeks(calendarWeeks[week - 1] || [])})`,
          style: "headerWrap",
        })
      ),
    ],
    ...staffRows,
  ];

  const example = staff
    .map((entry) => ({ name: entry.name, values: weeks.map((week) => cellValue(week, entry.staff_id)) }))
    .find((entry) => entry.values.some(Boolean));

  const shiftRows: XlsxCell[][] = [
    ["Schicht", "Zeit", "Mindestbesetzung"],
    ...shifts.map((entry) => [entry.name, `${entry.start_time} - ${entry.end_time}`, entry.min_staff]),
  ];

  return createXlsx({
    sheets: [
      {
        name: "Rotation",
        rows: rotationRows,
        columnWidths: [28, ...weeks.map(() => 20)],
        rowHeights: { [HEADER_ROW]: 34 },
        freeze: { rows: HEADER_ROW, cols: 1 },
        listValidations: shiftDropdown({
          headerRow: HEADER_ROW,
          staffCount: staff.length,
          weekCount: weeks.length,
          shiftNames: shifts.map((entry) => entry.name),
          shiftsSheet: SHIFTS_SHEET,
        }),
      },
      {
        name: "Anleitung",
        rows: createInstructionRows({
          config,
          calendarWeeks,
          current,
          example: example || {
            name: staff[0]?.name || "Anna Beispiel",
            values: [shifts[0]?.name || "Früh", shifts[1]?.name || ""],
          },
          shiftNames: shifts.map((entry) => entry.name),
        }),
        columnWidths: [22, 100],
      },
      {
        name: SHIFTS_SHEET,
        rows: shiftRows,
        headerRows: [1],
        columnWidths: [28, 18, 18],
      },
    ],
  });
}
