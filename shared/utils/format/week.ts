import { isoWeekRange } from "../week";
import { formatDayRange } from "./day";
import { fill, patternsFor } from "./patterns";

/** „KW 41“, or „KW 41/2026“ with the year. */
export function weekLabel(locale: string, week: number, year?: number): string {
  const patterns = patternsFor(locale);
  return year === undefined ? fill(patterns.week, { week }) : fill(patterns.weekOfYear, { week, year });
}

/** „06.10. – 12.10.“: Monday to Sunday of an ISO week. */
export function formatWeekDates(locale: string, year: number, week: number): string {
  const { start, end } = isoWeekRange(year, week);
  return formatDayRange(locale, start, end, "date");
}
