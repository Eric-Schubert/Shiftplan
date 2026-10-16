import type { SchoolHolidayPeriod } from "~/types/holiday";
import { t } from "~/i18n/server";
import {
  getHolidayApiUrl,
  getHolidayCacheDurationMs,
  getHolidayConfig,
  getHolidaySubdivisionName,
  getSchoolHolidayLookupRange,
  normalizeHolidaySubdivisionCode,
  toHolidaySubdivisionCode,
} from "~/server/config/holiday-config";
import { fetchOpenHolidays, pickName, type LocalizedName } from "~/server/lib/holidays/open-holidays";
import { instanceLocale } from "~/server/utils/locale";
import { isoWeekRange } from "~/shared/utils/week";

interface OpenSchoolHolidayResponse {
  id: string;
  startDate: string;
  endDate: string;
  type: string;
  name: LocalizedName;
  subdivisions?: Array<{ code: string; shortName: string }>;
}

export interface SchoolHoliday {
  name: string;
  start: string;
  end: string;
  state: string;
  stateName: string;
}

const schoolHolidayCache = new Map<string, { data: SchoolHoliday[]; timestamp: number }>();

async function fetchSchoolHolidaysFromAPI(year: number, stateCode: string): Promise<SchoolHoliday[]> {
  const config = getHolidayConfig();
  const fullStateCode = toHolidaySubdivisionCode(stateCode);
  const shortCode = normalizeHolidaySubdivisionCode(stateCode);
  const { validFrom, validTo } = getSchoolHolidayLookupRange(year);

  const url = getHolidayApiUrl("SchoolHolidays", {
    countryIsoCode: config.countryIsoCode,
    subdivisionCode: fullStateCode,
    languageIsoCode: config.languageIsoCode,
    validFrom,
    validTo,
  });
  const data = await fetchOpenHolidays<OpenSchoolHolidayResponse>(url);

  return data.map((holiday) => ({
    name: pickName(holiday.name, config.languageIsoCode, t(instanceLocale(), "holidays.school")),
    start: holiday.startDate,
    end: holiday.endDate,
    state: shortCode,
    stateName: getHolidaySubdivisionName(shortCode),
  }));
}

async function getSchoolHolidays(year: number, states: string[]): Promise<SchoolHoliday[]> {
  const normalizedStates = [...states].sort();
  const { countryIsoCode, languageIsoCode } = getHolidayConfig();
  const cacheKey = [year, countryIsoCode, languageIsoCode, normalizedStates.join(",")].join("|");
  const cached = schoolHolidayCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < getHolidayCacheDurationMs()) {
    return cached.data;
  }

  const results = await Promise.all(normalizedStates.map((state) => fetchSchoolHolidaysFromAPI(year, state)));
  const holidays = results.flat();
  holidays.sort((a, b) => a.start.localeCompare(b.start));

  schoolHolidayCache.set(cacheKey, { data: holidays, timestamp: Date.now() });
  return holidays;
}

function periodsOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  return start1 <= end2 && start2 <= end1;
}

/** Merges the per-state entries of the same holiday into one period with all states. */
function groupSchoolHolidays(holidays: SchoolHoliday[]): SchoolHolidayPeriod[] {
  const grouped = new Map<string, SchoolHolidayPeriod>();

  for (const holiday of holidays) {
    const key = `${holiday.name}-${holiday.start.substring(0, 7)}`;
    const existing = grouped.get(key);

    if (existing) {
      if (holiday.start < existing.start) existing.start = holiday.start;
      if (holiday.end > existing.end) existing.end = holiday.end;
      if (!existing.states.find((s) => s.code === holiday.state)) {
        existing.states.push({ code: holiday.state, name: holiday.stateName });
      }
    } else {
      grouped.set(key, {
        name: holiday.name,
        start: holiday.start,
        end: holiday.end,
        states: [{ code: holiday.state, name: holiday.stateName }],
      });
    }
  }

  return Array.from(grouped.values()).sort((a, b) => a.start.localeCompare(b.start));
}

export const SchoolHolidayService = {
  /** School holidays of the given states for a year, or only those touching one week of it. */
  async list(year: number, week: number | null, states: string[]) {
    let holidays = await getSchoolHolidays(year, states);

    if (week && !isNaN(week)) {
      const { start, end } = isoWeekRange(year, week);
      holidays = holidays.filter((h) => periodsOverlap(start, end, h.start, h.end));
    }

    return { holidays, grouped: groupSchoolHolidays(holidays) };
  },
};
