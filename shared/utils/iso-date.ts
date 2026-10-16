// Calendar dates as YYYY-MM-DD strings. The math runs on UTC dates, so no time zone shifts a day.

const DAY_MS = 86400000;

export function parseISODate(value: unknown): { year: number; month: number; day: number } | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return { year, month, day };
}

/** Every calendar day from `from` to `to` (inclusive) as YYYY-MM-DD, or null for an invalid range. */
export function datesBetween(from: string, to: string, maxDays: number): string[] | null {
  const start = parseISODate(from);
  const end = parseISODate(to);
  if (!start || !end) return null;
  const first = Date.UTC(start.year, start.month - 1, start.day);
  const last = Date.UTC(end.year, end.month - 1, end.day);
  const count = Math.round((last - first) / DAY_MS) + 1;
  if (count < 1 || count > maxDays) return null;
  return Array.from({ length: count }, (_, index) => new Date(first + index * DAY_MS).toISOString().slice(0, 10));
}

/** Saturday or Sunday, for a YYYY-MM-DD date. */
export function isWeekendDate(date: string): boolean {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}
