import { describe, expect, it } from "vitest";
import type { Absence } from "../types/absence";
import type { ShiftDayChange, ShiftWithStaff } from "../types/shiftplan";
import { workDates } from "../utils/shift-coverage";
import { shortNames, weekGridRow } from "../utils/week-grid";

const week = workDates(2026, 43, false);
const [mon, tue] = week as [string, string];

function shift(staff: Array<[number, string]>, minStaff = 1): ShiftWithStaff {
  return {
    shift_id: 1,
    name: "Spät",
    active: 1,
    start_time: "09:30",
    end_time: "18:00",
    color: "#000",
    min_staff: minStaff,
    sort_order: 1,
    assigned_staff: staff.map(([staff_id, name]) => ({ staff_id, name, active: 1, is_parttime: 0, short_code: null })),
  };
}

function change(staffId: number, name: string, date: string, kind: "add" | "remove"): ShiftDayChange {
  return {
    change_id: 0,
    staff_id: staffId,
    staff_name: name,
    shift_id: 1,
    shift_name: "Spät",
    change_date: date,
    kind,
    source: "web",
    created_by: "",
    created_at: "",
  };
}

function absence(staffId: number, date: string): Absence {
  return {
    absence_id: 0,
    staff_id: staffId,
    staff_name: "",
    absence_date: date,
    shift_id: null,
    shift_name: null,
    batch_id: null,
    range_from: date,
    range_to: date,
    source: "web",
    created_by: "",
    created_at: "",
  };
}

describe("week grid", () => {
  it("shows the stand-in instead of the absent planned person", () => {
    const changes = week.flatMap((date) => [change(1, "RF", date, "remove"), change(2, "RZ", date, "add")]);
    const row = weekGridRow(shift([[1, "RF"]]), week, changes, [absence(1, mon), absence(2, mon)], new Set(), "de-DE");
    expect(row[0]).toEqual({ date: mon, people: [], status: "open" });
    expect(row[1]).toEqual({ date: tue, people: [{ staffId: 2, name: "RZ", guest: true }], status: "ok" });
  });

  it("marks days below the minimum as short", () => {
    const row = weekGridRow(
      shift(
        [
          [1, "AR"],
          [2, "KM"],
        ],
        2
      ),
      week,
      [],
      [absence(2, tue)],
      new Set(),
      "de-DE"
    );
    expect(row.map((cell) => cell.status)).toEqual(["ok", "short", "ok", "ok", "ok"]);
  });

  it("lets holidays win over coverage", () => {
    const row = weekGridRow(shift([]), week, [], [], new Set([mon]), "de-DE");
    expect(row.map((cell) => cell.status)).toEqual(["holiday", "open", "open", "open", "open"]);
  });
});

describe("shortNames", () => {
  it("uses initials and keeps names that are already short", () => {
    const short = shortNames(["Anja Richter", "RZ", "Kai", "Benedikt"]);
    expect([...short.values()]).toEqual(["AR", "RZ", "Kai", "Be"]);
    expect(shortNames(["Anja Richter", "AR"]).get("Anja Richter")).toBe("AnR");
  });

  it("tells people with the same initials apart", () => {
    const short = shortNames(["Anja Richter", "Alex Roth", "Kai Meyer"]);
    expect([...short.values()]).toEqual(["AnR", "AlR", "KM"]);
  });
});
