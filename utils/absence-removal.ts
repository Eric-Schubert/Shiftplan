import { formatDay, formatDayRange } from "~/shared/utils/format/day";
import type { Absence } from "../types/absence";
import { todayISO } from "./week-dates";

type Row = Pick<Absence, "staff_name" | "absence_date" | "range_from" | "range_to">;

/** What removing an absence row does, for the question before it happens. A running range only ends today. */
export function removalNotice(locale: string, absence: Row, today = todayISO()): { text: string; confirm: string } {
  const name = absence.staff_name;
  if (absence.range_from === absence.range_to) {
    return { text: `Ausfall von ${name} am ${formatDay(locale, absence.absence_date)} löschen?`, confirm: "Löschen" };
  }
  const period = formatDayRange(locale, absence.range_from, absence.range_to);
  if (absence.range_from < today && absence.range_to >= today) {
    return {
      text: `Ausfall von ${name} (${period}) ab heute beenden? Die Tage bis gestern bleiben eingetragen.`,
      confirm: "Ab heute beenden",
    };
  }
  return { text: `Ausfall von ${name} (${period}) komplett löschen?`, confirm: "Löschen" };
}
