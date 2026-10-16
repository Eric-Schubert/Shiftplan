import type { AnalyticsLocationMetric } from "~/types/analytics";

export function formatPath(path: string): string {
  if (path === "/") return "Schichtplan";
  return path;
}

function countryName(locale: string, countryCode: string | null): string | null {
  if (!countryCode) return null;

  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(countryCode) || countryCode;
  } catch {
    return countryCode;
  }
}

export function formatLocation(locale: string, location: AnalyticsLocationMetric): string {
  const parts = [
    location.city,
    location.region,
    countryName(locale, location.countryCode) || location.countryCode,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "Unbekannt";
}
