import { formatDay, formatDayRange } from "~/shared/utils/format/day";
import type { MessageKey, MessageRef } from "~/i18n/types";
import type { Absence } from "../types/absence";
import { todayISO } from "./week-dates";

type Row = Pick<Absence, "staff_name" | "absence_date" | "range_from" | "range_to">;

/** What removing an absence row does, for the question before it happens. A running range only ends today. */
export function removalNotice(locale: string, absence: Row, today = todayISO()): { text: MessageRef; confirm: MessageKey } {
  const name = absence.staff_name;
  if (absence.range_from === absence.range_to) {
    const day = formatDay(locale, absence.absence_date);
    return { text: { key: "absence.remove.day", params: { name, day } }, confirm: "common.actions.delete" };
  }
  const period = formatDayRange(locale, absence.range_from, absence.range_to);
  if (absence.range_from < today && absence.range_to >= today) {
    return { text: { key: "absence.remove.endToday", params: { name, period } }, confirm: "absence.remove.endTodayConfirm" };
  }
  return { text: { key: "absence.remove.range", params: { name, period } }, confirm: "common.actions.delete" };
}
