import { getAnalyticsConfig } from "~/server/config/analytics-config";

export function clampSummaryDays(days?: number): number {
  const config = getAnalyticsConfig().summary;
  if (!Number.isFinite(days)) return config.defaultDays;
  return Math.min(config.maxDays, Math.max(1, Math.trunc(days || config.defaultDays)));
}

export function getBerlinDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: getAnalyticsConfig().timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

export function shiftDate(date: string, offsetDays: number): string {
  const dateParts = date.split("-").map(Number);
  const year = dateParts[0] || 1970;
  const month = dateParts[1] || 1;
  const day = dateParts[2] || 1;
  const shifted = new Date(Date.UTC(year, month - 1, day + offsetDays, 12));
  return shifted.toISOString().slice(0, 10);
}
