import { formatAbsenceDay, formatAbsenceRange, type Absence } from "../types/absence";
import { todayISO } from "./week-dates";

type Row = Pick<Absence, "staff_name" | "absence_date" | "range_from" | "range_to">;

/** What removing an absence row does, for the question before it happens. A running range only ends today. */
export function removalNotice(absence: Row, today = todayISO()): { text: string; confirm: string } {
  const name = absence.staff_name;
  if (absence.range_from === absence.range_to) {
    return { text: `Ausfall von ${name} am ${formatAbsenceDay(absence.absence_date)} löschen?`, confirm: "Löschen" };
  }
  const period = formatAbsenceRange(absence);
  if (absence.range_from < today && absence.range_to >= today) {
    return {
      text: `Ausfall von ${name} (${period}) ab heute beenden? Die Tage bis gestern bleiben eingetragen.`,
      confirm: "Ab heute beenden",
    };
  }
  return { text: `Ausfall von ${name} (${period}) komplett löschen?`, confirm: "Löschen" };
}
