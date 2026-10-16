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

/**
 * A label of growing length: initials („AR“, „Kai“, „Be“), then more of the first name
 * („AnR“, „Ben“, „AnnR“), at last the whole name.
 */
function label(name: string, level: number): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0]!;
  if (level === 0 && words.length === 1) return first.length <= 3 ? first : first.slice(0, 2);
  if (level === 0) return `${first[0]}${words.at(-1)![0]}`.toUpperCase();
  // Once the first name is used up, only the whole name is left.
  if (words.length > 1 && level >= first.length) return name;
  const short = words.length === 1 ? first.slice(0, level + 2) : `${first.slice(0, level + 1)}${words.at(-1)![0]!.toUpperCase()}`;
  return short.length >= words.join(" ").length ? name : short;
}

/**
 * Short labels for narrow screens, where they are all that names a person: initials, or the name
 * itself when it is already short. People whose labels clash get longer ones until every label is unique.
 */
export function shortNames(names: string[]): Map<string, string> {
  const unique = [...new Set(names)];
  const levels = new Map(unique.map((name) => [name, 0]));
  // Every round lengthens a label, and whole names never clash, so this ends; the bound is a guard.
  for (let round = 0; round < 100; round++) {
    const labels = new Map(unique.map((name) => [name, label(name, levels.get(name)!)]));
    const counts = new Map<string, number>();
    for (const short of labels.values()) counts.set(short, (counts.get(short) ?? 0) + 1);
    // A label that is the whole name cannot grow; the others in its clash move on.
    const clashing = unique.filter((name) => counts.get(labels.get(name)!)! > 1 && labels.get(name) !== name);
    if (clashing.length === 0) return labels;
    for (const name of clashing) levels.set(name, levels.get(name)! + 1);
  }
  return new Map(unique.map((name) => [name, name]));
}
