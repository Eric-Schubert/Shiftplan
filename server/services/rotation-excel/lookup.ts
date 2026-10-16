import type { XlsxCellValue } from "~/server/utils/xlsx";
import type { Shift } from "~/types/shift";
import type { Staff } from "~/types/staff";
import { messageRef, type MessageRef } from "~/server/utils/api-error";
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
      console.warn(`[rotation-excel] ${label}: ${matches.length} entries with the same name`);
    }
  }

  return lookup;
}

export function resolveByName<T extends Staff | Shift>(
  lookup: Map<string, T[]>,
  name: string,
  label: MessageRef,
  location: MessageRef
): T {
  const normalized = normalizeName(name);

  if (!normalized) {
    badRequest("excel.nameMissing", { label, location });
  }

  const matches = lookup.get(normalized) || [];

  if (matches.length === 0) {
    badRequest("excel.nameUnknown", { label, name, location });
  }

  if (matches.length > 1) {
    badRequest("excel.nameAmbiguous", { label, name, location });
  }

  const match = matches[0];
  if (!match) {
    badRequest("excel.nameUnknown", { label, name, location });
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
    const shiftId = toInteger(options.shiftIdValue, messageRef("excel.labels.shiftIdInRow", { row: options.rowNumber }));
    const shift = options.shiftsById.get(shiftId);

    if (!shift) {
      badRequest("excel.shiftIdUnknown", { id: shiftId, row: options.rowNumber });
    }

    return shift;
  }

  const shiftName = toText(options.shiftNameValue);
  const location = messageRef("excel.locations.row", { row: options.rowNumber });
  return resolveByName(options.shiftsByName, shiftName, messageRef("excel.labels.shift"), location);
}
