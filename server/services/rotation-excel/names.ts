import type { XlsxCellValue } from "~/server/utils/xlsx";
import type { Shift } from "~/types/shift";
import type { Staff } from "~/types/staff";
import type { MessageRef } from "~/server/utils/api-error";
import { normalizeName, toText } from "~/server/services/rotation-excel/cells";
import { FREE_MARKERS } from "~/server/services/rotation-excel/labels";
import { resolveByName } from "~/server/services/rotation-excel/lookup";

const SEPARATORS = /([,;\n\r]+)/;
const partCounts = new WeakMap<Map<string, unknown[]>, number>();

/** Parts of the longest name that contains a separator, e.g. 2 for "Nacht, lang"; 1 when none does. */
function maxParts(names: Map<string, unknown[]>): number {
  let max = partCounts.get(names);
  if (max === undefined) {
    max = Math.max(1, ...[...names.keys()].map((name) => Math.ceil(name.split(SEPARATORS).length / 2)));
    partCounts.set(names, max);
  }
  return max;
}

/**
 * Splits "Anna, Ben" or "Früh; Spät" into names. A name with a separator in it ("Nacht, lang") is taken
 * whole when it matches one of `names`, so it survives the template round trip. "-" and the free word of
 * every locale ("frei") count as empty, unless one of `names` is called that: a shift named "frei" stays a shift.
 */
export function splitList(text: string, names: Map<string, unknown[]>): string[] {
  const pieces = text.split(SEPARATORS);
  const joined = (from: number, parts: number) => pieces.slice(from * 2, from * 2 + parts * 2 - 1).join("");
  const tokenCount = Math.ceil(pieces.length / 2);
  const result: string[] = [];

  for (let index = 0; index < tokenCount;) {
    let parts = Math.min(maxParts(names), tokenCount - index);
    while (parts > 1 && !names.has(normalizeName(joined(index, parts)))) parts--;

    const name = joined(index, parts).trim();
    const key = normalizeName(name);
    if (name !== "" && (!FREE_MARKERS.has(key) || names.has(key))) result.push(name);
    index += parts;
  }

  return result;
}

/**
 * Resolves the names of a list cell once per distinct text. Cells that point to one shared string all
 * carry the same text, so a crafted file cannot make the import split one long text thousands of times.
 */
export function listResolver<T extends Staff | Shift>(lookup: Map<string, T[]>, label: MessageRef): (value: XlsxCellValue, location: MessageRef) => T[] {
  const resolved = new Map<string, T[]>();
  return (value, location) => {
    const text = toText(value);
    let items = resolved.get(text);
    if (!items) {
      items = [...new Set(splitList(text, lookup).map((name) => resolveByName(lookup, name, label, location)))];
      resolved.set(text, items);
    }
    return items;
  };
}
