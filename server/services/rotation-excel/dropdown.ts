import { cellRef } from "~/server/lib/xlsx/cell-ref";
import type { XlsxListValidation } from "~/server/lib/xlsx/types";

/** Shift dropdown for the grid below the header, fed from column A of the shifts sheet. */
export function shiftDropdown(options: {
  headerRow: number;
  staffCount: number;
  weekCount: number;
  shiftNames: string[];
  shiftsSheet: string;
}): XlsxListValidation[] {
  const { headerRow, staffCount, weekCount, shiftNames, shiftsSheet } = options;
  if (staffCount === 0 || weekCount === 0 || shiftNames.length === 0) return [];

  return [
    {
      range: `${cellRef(headerRow + 1, 2)}:${cellRef(headerRow + staffCount, weekCount + 1)}`,
      source: `${shiftsSheet}!$A$2:$A$${shiftNames.length + 1}`,
      prompt: "Schicht wählen oder leer lassen (= frei).",
      warning: `Diese Schicht steht nicht in der Liste. Zwei Schichten in einer Woche mit Komma schreiben, z. B. „${shiftNames
        .slice(0, 2)
        .join(", ")}“.`,
    },
  ];
}
