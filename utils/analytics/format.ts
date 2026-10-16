import type { AnalyticsLocationMetric } from "~/types/analytics";

/** The path of a page, with the start page under the name the caller gives it. */
export function formatPath(path: string, startPage: string): string {
  return path === "/" ? startPage : path;
}

function countryName(locale: string, countryCode: string | null): string | null {
  if (!countryCode) return null;

  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(countryCode) || countryCode;
  } catch {
    return countryCode;
  }
}

/** City, region and country, or null when the location is unknown. */
export function formatLocation(locale: string, location: AnalyticsLocationMetric): string | null {
  const parts = [location.city, location.region, countryName(locale, location.countryCode) || location.countryCode].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : null;
}
