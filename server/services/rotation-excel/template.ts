import { Buffer } from "node:buffer";
import { DEFAULT_LOCALE, type AppLocale } from "~/i18n/config";
import { t } from "~/i18n/server";
import { createXlsx, type XlsxCell } from "~/server/utils/xlsx";
import { RotationService } from "~/server/services/rotation.service";
import { ShiftService } from "~/server/services/shift.service";
import { StaffService } from "~/server/services/staff.service";
import { isoWeekOfDate } from "~/shared/utils/week";
import { upcomingCalendarWeeks } from "~/server/services/rotation-excel/calendar";
import { shiftDropdown } from "~/server/services/rotation-excel/dropdown";
import { createInstructionRows } from "~/server/services/rotation-excel/instructions";
import { patternCellValue, rotationRows } from "~/server/services/rotation-excel/template-rows";

const CALENDAR_WEEKS_SHOWN = 3;
/** Title, hint, three config rows, a spacer row, then the header with "Woche 1", "Woche 2", ... */
const HEADER_ROW = 7;

/** One row per active staff member, one column per pattern week, the shift name in each cell. */
export function createRotationTemplate(locale: AppLocale = DEFAULT_LOCALE): Buffer {
  const sheets = {
    instructions: t(locale, "excelTemplate.sheets.instructions"),
    rotation: t(locale, "excelTemplate.sheets.rotation"),
    shifts: t(locale, "excelTemplate.sheets.shifts"),
  };
  const pattern = RotationService.getFullPattern();
  const { config } = pattern;
  const staff = StaffService.getActive();
  const shifts = ShiftService.getActive();
  const calendarWeeks = upcomingCalendarWeeks(config, CALENDAR_WEEKS_SHOWN);
  const thisWeek = isoWeekOfDate(new Date());
  const current = { week: thisWeek, patternWeek: RotationService.calculatePatternWeek(thisWeek.year, thisWeek.week) };
  const weeks = pattern.weeks.map((week) => week.pattern_week);
  const cellValue = patternCellValue(pattern);

  const example = staff
    .map((entry) => ({ name: entry.name, values: weeks.map((week) => cellValue(week, entry.staff_id)) }))
    .find((entry) => entry.values.some(Boolean));

  const shiftRows: XlsxCell[][] = [
    [t(locale, "excel.labels.shift"), t(locale, "excelTemplate.time"), t(locale, "excelTemplate.minStaff")],
    ...shifts.map((entry) => [entry.name, `${entry.start_time} - ${entry.end_time}`, entry.min_staff]),
  ];

  return createXlsx({
    // The instructions come first, so a first-time user reads them before filling anything in.
    sheets: [
      {
        name: sheets.instructions,
        rows: createInstructionRows({
          locale,
          rotationSheet: sheets.rotation,
          config,
          staffCount: staff.length,
          calendarWeeks,
          current,
          example: example || {
            name: staff[0]?.name || t(locale, "excelTemplate.example.name"),
            values: [shifts[0]?.name || t(locale, "excelTemplate.example.early"), shifts[1]?.name || ""],
          },
          shiftNames: shifts.map((entry) => entry.name),
        }),
        columnWidths: [22, 100],
      },
      {
        name: sheets.rotation,
        rows: rotationRows({
          locale,
          instructionsSheet: sheets.instructions,
          config,
          staff,
          shifts,
          weeks,
          calendarWeeks,
          current,
          cellValue,
        }),
        columnWidths: [28, ...weeks.map(() => 20)],
        rowHeights: { [HEADER_ROW]: 34 },
        freeze: { rows: HEADER_ROW, cols: 1 },
        listValidations: shiftDropdown({
          locale,
          headerRow: HEADER_ROW,
          staffCount: staff.length,
          weekCount: weeks.length,
          shiftNames: shifts.map((entry) => entry.name),
          shiftsSheet: sheets.shifts,
        }),
      },
      {
        name: sheets.shifts,
        rows: shiftRows,
        headerRows: [1],
        columnWidths: [28, 18, 18],
      },
    ],
  });
}
