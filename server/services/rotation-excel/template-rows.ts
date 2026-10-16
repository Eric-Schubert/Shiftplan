import type { AppLocale } from "~/i18n/config";
import { t } from "~/i18n/server";
import type { XlsxCell } from "~/server/utils/xlsx";
import type { ISOWeek } from "~/shared/utils/week";
import type { FullRotationPattern, RotationConfig } from "~/types/rotation";
import type { Shift } from "~/types/shift";
import type { Staff } from "~/types/staff";
import { currentWeekText, formatCalendarWeeks } from "~/server/services/rotation-excel/calendar";

type CellValue = (week: number, staffId: number) => string;

type RotationSheetInput = {
  locale: AppLocale;
  /** Name of the instructions sheet, which the hint points to. */
  instructionsSheet: string;
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
  const { locale, instructionsSheet, config, staff, shifts, weeks, calendarWeeks, current, cellValue } = input;
  const staffRows: XlsxCell[][] = staff.map((entry) => [
    { value: entry.name, style: "label" },
    ...weeks.map((week): XlsxCell => ({ value: cellValue(week, entry.staff_id), style: "input" })),
  ]);

  return [
    [{ value: t(locale, "excelTemplate.title"), style: "title" }],
    [{ value: t(locale, "excelTemplate.hint", { sheet: instructionsSheet }), style: "hint" }],
    [
      { value: t(locale, "excel.labels.startYear"), style: "label" },
      config.start_year,
      { value: t(locale, "excelTemplate.startYearHint"), style: "hint" },
    ],
    [
      { value: t(locale, "excel.labels.startWeek"), style: "label" },
      config.start_week,
      { value: t(locale, "excelTemplate.startWeekHint"), style: "hint" },
    ],
    [
      { value: t(locale, "excel.labels.cycleLength"), style: "label" },
      config.cycle_length,
      { value: t(locale, "excelTemplate.cycleLengthHint"), style: "hint" },
    ],
    [
      {
        value:
          staff.length === 0 || shifts.length === 0
            ? t(locale, "excelTemplate.incomplete")
            : currentWeekText(locale, current),
        style: "hint",
      },
    ],
    [
      { value: t(locale, "excel.labels.staff"), style: "headerWrap" },
      ...weeks.map((week): XlsxCell => {
        const upcoming = formatCalendarWeeks(locale, calendarWeeks[week - 1] || []);
        // The import ignores the calendar weeks in brackets.
        return { value: `${t(locale, "excel.labels.week", { week })}\n(${upcoming})`, style: "headerWrap" };
      }),
    ],
    ...staffRows,
  ];
}
