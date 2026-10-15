import { getNextWeekFromSaturday } from "~/server/services/team-access/settings";
import { today } from "~/server/services/shift-request/common";
import { SWAP_MAX_DAYS } from "~/server/services/shift-request/types";
import { datesBetween, isWeekendDate } from "~/server/utils/iso-week";

/** Teams that open next week on Saturday never work weekends. */
export function isOffDay(date: string): boolean {
  return isWeekendDate(date) && getNextWeekFromSaturday();
}

/** Days of a request that the plan can still change: from today on, without days the team never works. */
export function requestDays(from: string, to: string): string[] {
  const first = today();
  const weekdaysOnly = getNextWeekFromSaturday();
  return (datesBetween(from, to, SWAP_MAX_DAYS) ?? []).filter(
    (date) => date >= first && !(weekdaysOnly && isWeekendDate(date))
  );
}
