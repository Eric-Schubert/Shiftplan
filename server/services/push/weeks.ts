import { getHolidayConfig } from "~/server/config/holiday-config";
import { toISOWeek } from "~/server/utils/iso-week";

/** Current and next ISO week in the planning time zone. */
export function getNotifiableWeeks(now = new Date()): Array<{ year: number; week: number }> {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: getHolidayConfig().timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const year = value("year");
  const month = value("month");
  const day = value("day");

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
