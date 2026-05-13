import { getBackendConfig } from "./backend-config";

const MS_PER_HOUR = 60 * 60 * 1000;

export function getHolidayConfig() {
  return getBackendConfig().holidays;
}

export function getHolidayCacheDurationMs(): number {
  return getHolidayConfig().cacheHours * MS_PER_HOUR;
}

export function normalizeHolidaySubdivisionCode(value: string): string {
  return value.replace(/^DE-/i, "").trim().toUpperCase();
}

export function toHolidaySubdivisionCode(value: string): string {
  const config = getHolidayConfig();
  const shortCode = normalizeHolidaySubdivisionCode(value);
  return `${config.countryIsoCode}-${shortCode}`;
}

export function getHolidaySubdivisionName(value: string): string {
  const code = normalizeHolidaySubdivisionCode(value);
  return getHolidayConfig().subdivisionNames[code] || code;
}

export function getPublicHolidaySubdivisionCodes(): string[] {
  return getHolidayConfig().public.subdivisionCodes.map(normalizeHolidaySubdivisionCode);
}

export function resolveSchoolHolidaySubdivisionCodes(statesParam?: string): string[] {
  const config = getHolidayConfig();
  const rawCodes = statesParam
    ? statesParam.split(",").map((entry) => entry.trim()).filter(Boolean)
    : config.school.defaultSubdivisionCodes;

  const knownStates = config.subdivisionNames;
  const codes = Array.from(new Set(rawCodes.map(normalizeHolidaySubdivisionCode)));
  const unknownCode = codes.find((code) => !knownStates[code]);

  if (unknownCode) {
    throw createError({
      statusCode: 400,
      statusMessage: `Unbekanntes Bundesland: ${unknownCode}`,
    });
  }

  return codes;
}

export function getHolidayApiUrl(path: "PublicHolidays" | "SchoolHolidays", params: Record<string, string>): string {
  const config = getHolidayConfig();
  const baseUrl = config.apiBaseUrl.replace(/\/+$/, "");
  const url = new URL(`${baseUrl}/${path}`);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

export function getSchoolHolidayLookupRange(year: number): { validFrom: string; validTo: string } {
  const window = getHolidayConfig().school.lookupWindow;

  return {
    validFrom: formatDate(year + window.startYearOffset, window.startMonth, window.startDay),
    validTo: formatDate(year + window.endYearOffset, window.endMonth, window.endDay),
  };
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${padDatePart(month)}-${padDatePart(day)}`;
}

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}
