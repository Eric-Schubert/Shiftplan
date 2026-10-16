import type { AppLocale } from "~/i18n/config";
import { t } from "~/i18n/server";
import { cellRef } from "~/server/lib/xlsx/cell-ref";
import type { XlsxListValidation } from "~/server/lib/xlsx/types";

/** A sheet name in a formula; Excel needs quotes around names with spaces or punctuation. */
function sheetRef(name: string): string {
  return /^[\p{L}_][\p{L}\p{N}_]*$/u.test(name) ? name : `'${name.replace(/'/g, "''")}'`;
}

/** Shift dropdown for the grid below the header, fed from column A of the shifts sheet. */
export function shiftDropdown(options: {
  locale: AppLocale;
  headerRow: number;
  staffCount: number;
  weekCount: number;
  shiftNames: string[];
  shiftsSheet: string;
}): XlsxListValidation[] {
  const { locale, headerRow, staffCount, weekCount, shiftNames, shiftsSheet } = options;
  if (staffCount === 0 || weekCount === 0 || shiftNames.length === 0) return [];

  return [
    {
      range: `${cellRef(headerRow + 1, 2)}:${cellRef(headerRow + staffCount, weekCount + 1)}`,
      source: `${sheetRef(shiftsSheet)}!$A$2:$A$${shiftNames.length + 1}`,
      prompt: t(locale, "excelTemplate.dropdown.prompt"),
      warning: t(locale, "excelTemplate.dropdown.warning", { shifts: shiftNames.slice(0, 2).join(", ") }),
    },
  ];
}
