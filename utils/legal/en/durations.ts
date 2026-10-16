import { inDays, inHoursOrMinutes, inYearsOrDays, type Amount } from "../durations";

// English durations for the privacy policy: "90 days", "one year", "2 years", "30 minutes".

const UNITS: Record<Amount["unit"], { one: string; many: string }> = {
  day: { one: "one day", many: "days" },
  year: { one: "one year", many: "years" },
  minute: { one: "one minute", many: "minutes" },
  hour: { one: "one hour", many: "hours" },
};

function text({ count, unit }: Amount): string {
  return count === 1 ? UNITS[unit].one : `${count} ${UNITS[unit].many}`;
}

/** Always in days: 365 → "365 days". */
export function daysText(days: number): string {
  return text(inDays(days));
}

/** In whole years where the days add up to them: 365 → "one year", 730 → "2 years", 90 → "90 days". */
export function periodText(days: number): string {
  return text(inYearsOrDays(days));
}

/** In whole hours where the minutes add up to them: 30 → "30 minutes", 120 → "2 hours". */
export function minutesText(minutes: number): string {
  return text(inHoursOrMinutes(minutes));
}
