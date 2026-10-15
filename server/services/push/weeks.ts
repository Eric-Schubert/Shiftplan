import { getHolidayConfig } from "~/server/config/holiday-config";
import { toISOWeek } from "~/server/utils/iso-week";

function planningDate(now: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: getHolidayConfig().timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

/** Today in the planning time zone as YYYY-MM-DD. */
export function getPlanningToday(now = new Date()): string {
  const { year, month, day } = planningDate(now);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

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
