




import { defineEventHandler, getQuery, createError } from 'h3';
import type { HolidaySubdivision } from "~/types/holiday";
import {
  getHolidayApiUrl,
  getHolidayCacheDurationMs,
  getHolidayConfig,
  getHolidaySubdivisionName,
  getSchoolHolidayLookupRange,
  resolveSchoolHolidaySubdivisionCodes,
  toHolidaySubdivisionCode,
} from "~/server/config/holiday-config";


interface OpenSchoolHolidayResponse {
  id: string;
  startDate: string;
  endDate: string;
  type: string;
  name: Array<{ language: string; text: string }>;
  subdivisions?: Array<{ code: string; shortName: string }>;
}


export interface SchoolHoliday {
  name: string;
  start: string;
  end: string;
  state: string;
  stateName: string;
}


export interface SchoolHolidayPeriod {
  name: string;
  start: string;
  end: string;
  states: HolidaySubdivision[];
}


const schoolHolidayCache = new Map<string, { data: SchoolHoliday[]; timestamp: number }>();




function getWeekDateRange(year: number, week: number): { start: string; end: string } {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);

  const weekStart = new Date(firstMonday);
  weekStart.setDate(firstMonday.getDate() + (week - 1) * 7);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  return {
    start: weekStart.toISOString().slice(0, 10),
    end: weekEnd.toISOString().slice(0, 10)
  };
}




function periodsOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  return start1 <= end2 && start2 <= end1;
}




async function fetchSchoolHolidaysFromAPI(year: number, stateCode: string): Promise<SchoolHoliday[]> {
  const config = getHolidayConfig();

  const fullStateCode = toHolidaySubdivisionCode(stateCode);
  const shortCode = stateCode.replace('DE-', '').toUpperCase();


  const { validFrom, validTo } = getSchoolHolidayLookupRange(year);

  const url = getHolidayApiUrl("SchoolHolidays", {
    countryIsoCode: config.countryIsoCode,
    subdivisionCode: fullStateCode,
    languageIsoCode: config.languageIsoCode,
    validFrom,
    validTo,
  });

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`OpenHolidays API error: ${response.status}`);
  }

  const data: OpenSchoolHolidayResponse[] = await response.json();


  const holidays: SchoolHoliday[] = data.map(holiday => {
    const germanName = holiday.name.find(n => n.language === 'DE')?.text
      || holiday.name[0]?.text
      || 'Schulferien';

    return {
      name: germanName,
      start: holiday.startDate,
      end: holiday.endDate,
      state: shortCode,
      stateName: getHolidaySubdivisionName(shortCode)
    };
  });

  return holidays;
}




async function getSchoolHolidays(year: number, states: string[]): Promise<SchoolHoliday[]> {
  const normalizedStates = [...states].sort();
  const cacheKey = `${year}-${normalizedStates.join(',')}`;
  const cached = schoolHolidayCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < getHolidayCacheDurationMs()) {
    return cached.data;
  }


  const promises = normalizedStates.map(state => fetchSchoolHolidaysFromAPI(year, state));
  const results = await Promise.all(promises);
  const holidays = results.flat();


  holidays.sort((a, b) => a.start.localeCompare(b.start));

  schoolHolidayCache.set(cacheKey, { data: holidays, timestamp: Date.now() });

  return holidays;
}




function groupSchoolHolidays(holidays: SchoolHoliday[]): SchoolHolidayPeriod[] {
  const grouped = new Map<string, SchoolHolidayPeriod>();

  for (const holiday of holidays) {

    const key = `${holiday.name}-${holiday.start.substring(0, 7)}`;

    const existing = grouped.get(key);
    if (existing) {

      if (holiday.start < existing.start) existing.start = holiday.start;
      if (holiday.end > existing.end) existing.end = holiday.end;


      if (!existing.states.find(s => s.code === holiday.state)) {
        existing.states.push({ code: holiday.state, name: holiday.stateName });
      }
    } else {
      grouped.set(key, {
        name: holiday.name,
        start: holiday.start,
        end: holiday.end,
        states: [{ code: holiday.state, name: holiday.stateName }]
      });
    }
  }

  return Array.from(grouped.values()).sort((a, b) => a.start.localeCompare(b.start));
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);

  const year = parseInt(query.year as string);
  const week = query.week ? parseInt(query.week as string) : null;
  const statesParam = Array.isArray(query.states)
    ? query.states.join(",")
    : query.states as string | undefined;
  const states = resolveSchoolHolidaySubdivisionCodes(statesParam);

  if (!year || isNaN(year)) {
    throw createError({
      statusCode: 400,
      message: 'Parameter "year" ist erforderlich'
    });
  }

  try {
    let holidays = await getSchoolHolidays(year, states);


    if (week && !isNaN(week)) {
      const { start, end } = getWeekDateRange(year, week);
      holidays = holidays.filter(h => periodsOverlap(start, end, h.start, h.end));
    }


    const grouped = groupSchoolHolidays(holidays);

    return {
      holidays,
      grouped
    };
  } catch (error: any) {
    console.error('Fehler beim Abrufen der Schulferien:', error);
    throw createError({
      statusCode: 500,
      message: `Fehler beim Abrufen der Schulferien: ${error.message}`
    });
  }
});
