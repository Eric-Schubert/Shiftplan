import { isoWeekRange } from "../week";
import { formatDayRange } from "./day";
import { fill, patternsFor } from "./patterns";

/** „KW 41“ */
export function weekLabel(locale: string, week: number): string {
  return fill(patternsFor(locale).week, { week });
}

/** „KW 41/2026“ */
export function weekOfYearLabel(locale: string, year: number, week: number): string {
  return fill(patternsFor(locale).weekOfYear, { week, year });
}

/** „06.10. – 12.10.“: Monday to Sunday of an ISO week. */
export function formatWeekDates(locale: string, year: number, week: number): string {
  const { start, end } = isoWeekRange(year, week);
  return formatDayRange(locale, start, end, "date");
}
