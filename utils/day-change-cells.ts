import type { ShiftDayChange } from "../types/shiftplan";

export function cellKey(staffId: number, date: string): string {
  return `${staffId}-${date}`;
}

/**
 * Whether someone works the shift on a day of the grid. A change just saved wins until the
 * refreshed plan arrives, so a quick second tap toggles from the new state, not the old one.
 */
export function isCellPresent(
  staffId: number,
  date: string,
  assigned: Set<number>,
  dayChanges: ShiftDayChange[],
  saved: Record<string, boolean>
): boolean {
  const key = cellKey(staffId, date);
  if (key in saved) return saved[key]!;
  const entry = dayChanges.find((change) => change.staff_id === staffId && change.change_date === date);
  return entry ? entry.kind === "add" : assigned.has(staffId);
}

/** Drops saved cells once the refreshed day changes show the same; the others stay until theirs arrive. */
export function pruneSaved(
  saved: Record<string, boolean>,
  assigned: Set<number>,
  dayChanges: ShiftDayChange[]
): Record<string, boolean> {
  const left: Record<string, boolean> = {};
  for (const [key, present] of Object.entries(saved)) {
    const [staffId, ...date] = key.split("-");
    if (isCellPresent(Number(staffId), date.join("-"), assigned, dayChanges, {}) !== present) left[key] = present;
  }
  return left;
}
