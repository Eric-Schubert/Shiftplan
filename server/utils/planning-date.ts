import { getHolidayConfig } from "~/server/config/holiday-config";

/** Today's calendar date in the planning time zone, so midnight there is the day boundary, not UTC midnight. */
export function planningDate(now = new Date()): { year: number; month: number; day: number } {
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
export function planningToday(now = new Date()): string {
  const { year, month, day } = planningDate(now);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
