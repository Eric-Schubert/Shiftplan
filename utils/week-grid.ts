import { collator } from "~/shared/utils/format/number";
import type { Absence } from "../types/absence";
import type { ShiftDayChange, ShiftWithStaff } from "../types/shiftplan";
import { staffOnDay } from "./shift-coverage";

export interface GridPerson {
  staffId: number;
  name: string;
  /** Not in the weekly plan, only joins on this day. */
  guest: boolean;
}

/** `holiday` wins over coverage: nobody is expected to work then. */
export type GridStatus = "ok" | "short" | "open" | "holiday";

export interface GridCell {
  date: string;
  people: GridPerson[];
  status: GridStatus;
}

/** One row of the week grid: who actually works the shift on each day. */
export function weekGridRow(
  shift: ShiftWithStaff,
  dates: string[],
  dayChanges: ShiftDayChange[],
  absences: Absence[],
  holidays: Set<string>,
  locale: string
): GridCell[] {
  const names = new Map(shift.assigned_staff.map((staff) => [staff.staff_id, staff.name]));
  for (const change of dayChanges) if (!names.has(change.staff_id)) names.set(change.staff_id, change.staff_name);
  const planned = new Set(shift.assigned_staff.map((staff) => staff.staff_id));

  return dates.map((date) => {
    const people = staffOnDay(shift, date, dayChanges, absences)
      .map((staffId) => ({ staffId, name: names.get(staffId) ?? "", guest: !planned.has(staffId) }))
      .sort((a, b) => Number(a.guest) - Number(b.guest) || collator(locale).compare(a.name, b.name));
    const status: GridStatus = holidays.has(date)
      ? "holiday"
      : people.length === 0 && shift.min_staff > 0
        ? "open"
        : people.length < shift.min_staff
          ? "short"
          : "ok";
    return { date, people, status };
  });
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0]!.length <= 3 ? words[0]! : words[0]!.slice(0, 2);
  return `${words[0]![0]}${words.at(-1)![0]}`.toUpperCase();
}

/**
 * Short labels for narrow screens: initials, or the name itself when it is already short.
 * Two people with the same initials get the first two letters of the first name instead.
 */
export function shortNames(names: string[]): Map<string, string> {
  const unique = [...new Set(names)];
  const counts = new Map<string, number>();
  for (const name of unique) counts.set(initials(name), (counts.get(initials(name)) ?? 0) + 1);
  return new Map(
    unique.map((name) => {
      const short = initials(name);
      const words = name.trim().split(/\s+/);
      if (counts.get(short)! < 2 || words.length < 2) return [name, short];
      return [name, `${words[0]!.slice(0, 2)}${words.at(-1)![0]!.toUpperCase()}`];
    })
  );
}
