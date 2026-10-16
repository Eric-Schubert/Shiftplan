import type { PublicHoliday } from "~/types/holiday";
import { t } from "~/i18n/server";
import {
  getHolidayApiUrl,
  getHolidayCacheDurationMs,
  getHolidayConfig,
  getHolidaySubdivisionName,
  getPublicHolidaySubdivisionCodes,
  normalizeHolidaySubdivisionCode,
} from "~/server/config/holiday-config";
import { fetchOpenHolidays, pickName, type LocalizedName } from "~/server/lib/holidays/open-holidays";
import { instanceLocale } from "~/server/utils/locale";
import { isoWeekRange } from "~/shared/utils/week";

interface OpenHolidayResponse {
  id: string;
  startDate: string;
  endDate: string;
  type: string;
  name: LocalizedName;
  nationwide: boolean;
  subdivisions?: Array<{ code: string; shortName: string }>;
}

const holidayCache = new Map<string, { data: PublicHoliday[]; timestamp: number }>();

// The answer depends on the country, the name language and the configured states, not only on the year.
function cacheKey(year: number): string {
  const { countryIsoCode, languageIsoCode } = getHolidayConfig();
  return [year, countryIsoCode, languageIsoCode, getPublicHolidaySubdivisionCodes().join(",")].join("|");
}

async function fetchHolidaysFromAPI(year: number): Promise<PublicHoliday[]> {
  const config = getHolidayConfig();
  const url = getHolidayApiUrl("PublicHolidays", {
    countryIsoCode: config.countryIsoCode,
    languageIsoCode: config.languageIsoCode,
    validFrom: `${year}-01-01`,
    validTo: `${year}-12-31`,
  });
  const data = await fetchOpenHolidays<OpenHolidayResponse>(url);
  const holidays: PublicHoliday[] = [];

  for (const holiday of data) {
    if (holiday.type !== "Public") continue;

    const isNational = holiday.nationwide;
    const configuredCodes = new Set(getPublicHolidaySubdivisionCodes());
    const states = (holiday.subdivisions || [])
      .map((subdivision) => normalizeHolidaySubdivisionCode(subdivision.code))
      .filter((code) => configuredCodes.has(code))
      .map((code) => ({
        code,
        name: getHolidaySubdivisionName(code),
      }));

    if (!(isNational && config.public.includeNationwide) && states.length === 0) continue;

    holidays.push({
      date: holiday.startDate,
      name: pickName(holiday.name, config.languageIsoCode, t(instanceLocale(), "holidays.unnamed")),
      type: isNational ? "national" : config.public.regionalType,
      nationwide: isNational,
      states: isNational ? [] : states,
    });
  }

  holidays.sort((a, b) => a.date.localeCompare(b.date));
  return holidays;
}

async function getHolidays(year: number): Promise<PublicHoliday[]> {
  const key = cacheKey(year);
  const cached = holidayCache.get(key);
  if (cached && Date.now() - cached.timestamp < getHolidayCacheDurationMs()) {
    return cached.data;
  }

  const holidays = await fetchHolidaysFromAPI(year);
  holidayCache.set(key, { data: holidays, timestamp: Date.now() });
  return holidays;
}

export const PublicHolidayService = {
  /** Holidays of a year, or of one week of it (a week can reach into the neighbouring years). */
  async list(year: number, week: number | null): Promise<PublicHoliday[]> {
    const holidays = await getHolidays(year);
    if (!week || isNaN(week)) return holidays;

    const { start, end } = isoWeekRange(year, week);
    const prevYear = await getHolidays(year - 1);
    const nextYear = await getHolidays(year + 1);
    const allHolidays = [...prevYear, ...holidays, ...nextYear];

    return allHolidays.filter((h) => h.date >= start && h.date <= end);
  },
};
