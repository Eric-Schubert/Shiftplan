// Periods of the privacy policy, split the same way in every language: whole years where the days add up
// to them, whole hours where the minutes do. Each language words them in utils/legal/<locale>/durations.ts.

export type Amount = { count: number; unit: "minute" | "hour" | "day" | "year" };

const DAYS_PER_YEAR = 365;
const MINUTES_PER_HOUR = 60;

/** Always in days: 365 → 365 days. */
export function inDays(days: number): Amount {
  return { count: days, unit: "day" };
}

/** In whole years where the days add up to them: 365 → one year, 730 → 2 years, 90 → 90 days. */
export function inYearsOrDays(days: number): Amount {
  return days % DAYS_PER_YEAR === 0 ? { count: days / DAYS_PER_YEAR, unit: "year" } : inDays(days);
}

/** In whole hours where the minutes add up to them: 30 → 30 minutes, 120 → 2 hours. */
export function inHoursOrMinutes(minutes: number): Amount {
  return minutes % MINUTES_PER_HOUR === 0 ? { count: minutes / MINUTES_PER_HOUR, unit: "hour" } : { count: minutes, unit: "minute" };
}
