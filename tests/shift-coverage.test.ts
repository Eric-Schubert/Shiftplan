import { describe, expect, it } from "vitest";
import type { Absence } from "../types/absence";
import type { ShiftDayChange, ShiftWithStaff } from "../types/shiftplan";
import { formatWeekdays, understaffedDates, workDates } from "../utils/shift-coverage";

// KW 43/2026: Mo 19.10. – So 25.10.
const week = workDates(2026, 43, false);
const [mon, tue] = week as [string, string];

function shift(shiftId: number, staffIds: number[], minStaff = 1): ShiftWithStaff {
  return {
    shift_id: shiftId,
    name: `Schicht ${shiftId}`,
    active: 1,
    start_time: "06:00",
    end_time: "14:00",
    color: "#000",
    min_staff: minStaff,
    sort_order: shiftId,
    assigned_staff: staffIds.map((staffId) => ({ staff_id: staffId, name: `S${staffId}` }) as never),
  };
}

function change(shiftId: number, staffId: number, date: string, kind: "add" | "remove"): ShiftDayChange {
  return { change_id: 0, staff_id: staffId, staff_name: "", shift_id: shiftId, shift_name: "", change_date: date, kind, source: "web", created_by: "", created_at: "" };
}

function absence(staffId: number, date: string, shiftId: number | null = null): Absence {
  return { absence_id: 0, staff_id: staffId, staff_name: "", absence_date: date, shift_id: shiftId, shift_name: null, batch_id: null, range_from: date, range_to: date, source: "web", created_by: "", created_at: "" };
}

describe("shift coverage", () => {
  it("covers Mo–Fr, or the whole week for teams with weekend shifts", () => {
    expect(week).toEqual(["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"]);
    expect(workDates(2026, 43, true)).toHaveLength(7);
  });

  it("counts people taken out for a day as missing", () => {
    const changes = week.map((date) => change(1, 7, date, "remove"));
    expect(understaffedDates(shift(1, [7]), week, changes, [])).toEqual(week);
  });

  it("counts day guests and drops their absences", () => {
    const changes = week.map((date) => change(1, 9, date, "add"));
    expect(understaffedDates(shift(1, []), week, changes, [absence(9, mon, 1)])).toEqual([mon]);
  });

  it("ignores absences that belong to another shift", () => {
    expect(understaffedDates(shift(1, [7]), week, [], [absence(7, tue, 2)])).toEqual([]);
    expect(understaffedDates(shift(1, [7]), week, [], [absence(7, tue)])).toEqual([tue]);
  });
});

describe("formatWeekdays", () => {
  it("joins runs of three or more days", () => {
    expect(formatWeekdays(week)).toBe("Mo–Fr");
    expect(formatWeekdays(["2026-10-19", "2026-10-20"])).toBe("Mo, Di");
    expect(formatWeekdays(["2026-10-19", "2026-10-21", "2026-10-22", "2026-10-23"])).toBe("Mo, Mi–Fr");
    expect(formatWeekdays(["2026-10-23", "2026-10-19", "2026-10-19"])).toBe("Mo, Fr");
  });
});
