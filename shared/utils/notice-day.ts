import { parseISODate } from "./iso-date";

// Short German weekday labels for push texts and audit notes.
const WEEKDAYS = ["So.", "Mo.", "Di.", "Mi.", "Do.", "Fr.", "Sa."];

/** „Do. 08.10.“ for a YYYY-MM-DD date. */
export function formatNoticeDay(date: string): string {
  const parsed = parseISODate(date)!;
  const day = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  return `${WEEKDAYS[day.getUTCDay()]} ${String(parsed.day).padStart(2, "0")}.${String(parsed.month).padStart(2, "0")}.`;
}
