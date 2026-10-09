import type { XlsxCellValue } from "~/server/utils/xlsx";
import type { Shift } from "~/types/shift";
import type { Staff } from "~/types/staff";
import { badRequest, normalizeName, toInteger, toText } from "~/server/services/rotation-excel/cells";

export function makeNameLookup<T extends Staff | Shift>(items: T[], label: string): Map<string, T[]> {
  const lookup = new Map<string, T[]>();

  for (const item of items) {
    const key = normalizeName(item.name);
    const matches = lookup.get(key) || [];
    matches.push(item);
    lookup.set(key, matches);
  }

  // No names in the log: it is kept longer than the plan data and may outlive a person.
  for (const matches of lookup.values()) {
    if (matches.length > 1) {
      console.warn(`[rotation-excel] ${label}: ${matches.length} Einträge mit gleichem Namen`);
    }
  }

  return lookup;
}

export function resolveByName<T extends Staff | Shift>(
  lookup: Map<string, T[]>,
  name: string,
  label: string,
  rowNumber: number
): T {
  const normalized = normalizeName(name);

  if (!normalized) {
    badRequest(`${label} in Zeile ${rowNumber} fehlt`);
  }

  const matches = lookup.get(normalized) || [];

  if (matches.length === 0) {
    badRequest(`${label} '${name}' in Zeile ${rowNumber} ist unbekannt oder inaktiv`);
  }

  if (matches.length > 1) {
    badRequest(`${label} '${name}' in Zeile ${rowNumber} ist mehrfach vorhanden`);
  }

  const match = matches[0];
  if (!match) {
    badRequest(`${label} '${name}' in Zeile ${rowNumber} ist unbekannt oder inaktiv`);
  }

  return match;
}

export function resolveShift(options: {
  rowNumber: number;
  shiftIdValue: XlsxCellValue;
  shiftNameValue: XlsxCellValue;
  shiftsById: Map<number, Shift>;
  shiftsByName: Map<string, Shift[]>;
}): Shift {
  const shiftIdText = toText(options.shiftIdValue);

  if (shiftIdText !== "") {
    const shiftId = toInteger(options.shiftIdValue, `Schicht-ID in Zeile ${options.rowNumber}`);
    const shift = options.shiftsById.get(shiftId);

    if (!shift) {
      badRequest(`Schicht-ID ${shiftId} in Zeile ${options.rowNumber} ist unbekannt oder inaktiv`);
    }

    return shift;
  }

  const shiftName = toText(options.shiftNameValue);
  return resolveByName(options.shiftsByName, shiftName, "Schicht", options.rowNumber);
}
