import type { AnalyticsLocationMetric } from "~/types/analytics";

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(value || 0);
}

export function formatAverage(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value || 0);
}

export function formatDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function formatLongDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

export function formatPath(path: string): string {
  if (path === "/") return "Schichtplan";
  return path;
}

function countryName(countryCode: string | null): string | null {
  if (!countryCode) return null;

  try {
    return new Intl.DisplayNames(["de"], { type: "region" }).of(countryCode) || countryCode;
  } catch {
    return countryCode;
  }
}

export function formatLocation(location: AnalyticsLocationMetric): string {
  const parts = [
    location.city,
    location.region,
    countryName(location.countryCode) || location.countryCode,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "Unbekannt";
}
