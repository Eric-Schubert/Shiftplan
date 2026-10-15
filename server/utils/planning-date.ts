import { getHolidayConfig } from "~/server/config/holiday-config";

/** Today as YYYY-MM-DD in the planning time zone, so midnight there is the day boundary, not UTC midnight. */
export function planningToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: getHolidayConfig().timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
