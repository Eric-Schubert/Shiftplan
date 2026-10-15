import { toISOWeek } from "~/server/utils/iso-week";
import { planningDate } from "~/server/utils/planning-date";

/** Current and next ISO week in the planning time zone. */
export function getNotifiableWeeks(now = new Date()): Array<{ year: number; week: number }> {
  const { year, month, day } = planningDate(now);

  const nextWeekDate = new Date(Date.UTC(year, month - 1, day + 7));
  return [
    toISOWeek(year, month, day),
    toISOWeek(
      nextWeekDate.getUTCFullYear(),
      nextWeekDate.getUTCMonth() + 1,
      nextWeekDate.getUTCDate()
    ),
  ];
}
