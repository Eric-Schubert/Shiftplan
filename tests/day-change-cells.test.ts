import { describe, expect, it } from "vitest";
import type { ShiftDayChange } from "../types/shiftplan";
import { cellKey, isCellPresent, pruneSaved } from "../utils/day-change-cells";

const ANNA = 1;
const MAX = 2;
const THURSDAY = "2026-10-08";
const assigned = new Set([ANNA]);

function removed(staffId: number, date: string): ShiftDayChange {
  return { staff_id: staffId, change_date: date, kind: "remove" } as ShiftDayChange;
}

describe("day change grid cells", () => {
  it("shows a saved cell until the refreshed plan arrives, so a second tap toggles back", () => {
    const stale: ShiftDayChange[] = [];
    const saved = { [cellKey(ANNA, THURSDAY)]: false };

    expect(isCellPresent(ANNA, THURSDAY, assigned, stale, {})).toBe(true);
    expect(isCellPresent(ANNA, THURSDAY, assigned, stale, saved)).toBe(false);
  });

  it("drops saved cells once the refreshed plan shows them", () => {
    const saved = { [cellKey(ANNA, THURSDAY)]: false, [cellKey(MAX, THURSDAY)]: true };

    expect(pruneSaved(saved, assigned, [])).toEqual(saved);
    expect(pruneSaved(saved, assigned, [removed(ANNA, THURSDAY)])).toEqual({ [cellKey(MAX, THURSDAY)]: true });
  });
});
