import type { XlsxCell } from "~/server/utils/xlsx";
import type { ISOWeek } from "~/shared/utils/week";
import type { FullRotationPattern, RotationConfig } from "~/types/rotation";
import type { Shift } from "~/types/shift";
import type { Staff } from "~/types/staff";
import { formatCalendarWeeks } from "~/server/services/rotation-excel/calendar";

type CellValue = (week: number, staffId: number) => string;

type RotationSheetInput = {
  config: RotationConfig;
  staff: Staff[];
  shifts: Shift[];
  weeks: number[];
  calendarWeeks: ISOWeek[][];
  current: { week: ISOWeek; patternWeek: number };
  cellValue: CellValue;
};

/** The shift names per pattern week and person, comma-separated, "" for a free week. */
export function patternCellValue(pattern: FullRotationPattern): CellValue {
  const shiftsByCell = new Map<string, string[]>();

  for (const week of pattern.weeks) {
    for (const assignment of week.assignments) {
      for (const member of assignment.staff) {
        const key = `${week.pattern_week}:${member.staff_id}`;
        shiftsByCell.set(key, [...(shiftsByCell.get(key) || []), assignment.shift.name]);
      }
    }
  }

  return (week, staffId) => (shiftsByCell.get(`${week}:${staffId}`) || []).join(", ");
}

/** Title, hint, three config rows, the current pattern week, the header, then one row per person. */
export function rotationRows(input: RotationSheetInput): XlsxCell[][] {
  const { config, staff, shifts, weeks, calendarWeeks, current, cellValue } = input;
  const staffRows: XlsxCell[][] = staff.map((entry) => [
    { value: entry.name, style: "label" },
    ...weeks.map((week): XlsxCell => ({ value: cellValue(week, entry.staff_id), style: "input" })),
  ]);

  return [
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
          staff.length === 0 || shifts.length === 0
            ? "Noch nicht alles angelegt: erst Mitarbeitende und Schichten in der App anlegen, dann die Vorlage neu herunterladen."
            : `Gerade (KW ${current.week.week}/${current.week.year}) läuft Woche ${current.patternWeek}.`,
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
}
