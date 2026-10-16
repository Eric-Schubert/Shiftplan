// Frozen copies of the German formatters that shared/utils/format replaced. Do not update them:
// tests/format-equivalence.test.ts compares the new code against exactly this output.

const SERVER_WEEKDAYS = ["So.", "Mo.", "Di.", "Mi.", "Do.", "Fr.", "Sa."];
const CLIENT_WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const pad = (value: number) => String(value).padStart(2, "0");

/** shared/utils/notice-day.ts: pushes, audit notes and errors. */
export function formatNoticeDay(date: string): string {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  return `${SERVER_WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]} ${pad(day)}.${pad(month)}.`;
}

/** types/absence.ts: the app's day labels. */
export function formatAbsenceDay(date: string, withDate = true): string {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  const weekday = CLIENT_WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]!;
  return withDate ? `${weekday} ${pad(day)}.${pad(month)}.` : weekday;
}

function nextDate(date: string): string {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
}

/** utils/shift-coverage.ts */
export function formatWeekdays(dates: string[]): string {
  const runs: string[][] = [];
  for (const date of [...new Set(dates)].sort()) {
    const run = runs.at(-1);
    if (run && nextDate(run.at(-1)!) === date) run.push(date);
    else runs.push([date]);
  }
  return runs
    .map((run) =>
      run.length >= 3
        ? `${formatAbsenceDay(run[0]!, false)}–${formatAbsenceDay(run.at(-1)!, false)}`
        : run.map((date) => formatAbsenceDay(date, false)).join(", ")
    )
    .join(", ");
}

/** utils/holiday.ts */
export function formatHolidayDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
}

export function formatHolidayPeriod(start: string, end: string): string {
  const formatDate = (date: Date) => date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  return `${formatDate(new Date(start))} – ${formatDate(new Date(end))}`;
}

/** stores/app/week.ts, for the local Monday and Sunday of a week. */
export function formatWeekDateRange({ start, end }: { start: Date; end: Date }): string {
  const formatDate = (date: Date) => date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  return `${formatDate(start)} – ${formatDate(end)}`;
}

/** utils/analytics/format.ts */
export const analytics = {
  formatNumber: (value: number) => new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(value || 0),
  formatAverage: (value: number) => new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1, minimumFractionDigits: 0 }).format(value || 0),
  formatDate: (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
  formatLongDate: (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" }),
};

/** utils/timestamp.ts */
export function formatTimestamp(value: number | Date): string {
  return new Date(value).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** server/services/contact-mail/message.ts with the default config (de-DE). */
export function formatMessageDate(value: string, timeZone: string): string {
  const date = new Date(value.endsWith("Z") ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone }).format(date);
}

/** utils/changelog/relative-date.ts, after the day difference. */
export function formatRelativeDays(diffDays: number): string {
  if (diffDays === 0) return "heute";
  if (diffDays === 1) return "gestern";
  return `vor ${diffDays} Tagen`;
}
