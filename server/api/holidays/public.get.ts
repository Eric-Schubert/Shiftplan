/**
 * API Route: /api/holidays/public
 * 
 * Ruft deutsche Feiertage von der OpenHolidays API ab.
 * Filtert auf bundesweite + konfigurierte regionale Feiertage.
 * 
 * Query Parameter:
 * - year: Jahr (required)
 * - week: Kalenderwoche (optional, filtert auf diese Woche)
 */

import { defineEventHandler, getQuery, createError } from 'h3';
import type { HolidaySubdivision } from "~/types/holiday";
import {
  getHolidayApiUrl,
  getHolidayCacheDurationMs,
  getHolidayConfig,
  getHolidaySubdivisionName,
  getPublicHolidaySubdivisionCodes,
  normalizeHolidaySubdivisionCode,
} from "~/server/config/holiday-config";

// OpenHolidays API Response Type
interface OpenHolidayResponse {
  id: string;
  startDate: string;
  endDate: string;
  type: string;
  name: Array<{ language: string; text: string }>;
  nationwide: boolean;
  subdivisions?: Array<{ code: string; shortName: string }>;
}

// Unsere vereinfachte Holiday-Struktur
export interface PublicHoliday {
  date: string;
  name: string;
  type: 'national' | 'regional';
  nationwide: boolean;
  states: HolidaySubdivision[];
}

// Cache für API-Responses (In-Memory, pro Jahr)
const holidayCache = new Map<number, { data: PublicHoliday[]; timestamp: number }>();

/**
 * Berechnet Start- und Enddatum einer Kalenderwoche (ISO 8601)
 */
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

/**
 * Holt Feiertage von der OpenHolidays API
 */
async function fetchHolidaysFromAPI(year: number): Promise<PublicHoliday[]> {
  const config = getHolidayConfig();
  const validFrom = `${year}-01-01`;
  const validTo = `${year}-12-31`;
  
  const url = getHolidayApiUrl("PublicHolidays", {
    countryIsoCode: config.countryIsoCode,
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
  
  const data: OpenHolidayResponse[] = await response.json();
  
  // Transformiere und filtere auf relevante Feiertage
  const holidays: PublicHoliday[] = [];
  
  for (const holiday of data) {
    // Nur "Public" Feiertage (keine Observances etc.)
    if (holiday.type !== 'Public') continue;
    
    // Deutschen Namen extrahieren
    const germanName = holiday.name.find(n => n.language === 'DE')?.text 
      || holiday.name[0]?.text 
      || 'Unbekannt';
    
    // Prüfen ob bundesweit oder für konfigurierte Bundesländer relevant
    const isNational = holiday.nationwide;
    const configuredCodes = new Set(getPublicHolidaySubdivisionCodes());
    const states = (holiday.subdivisions || [])
      .map((subdivision) => normalizeHolidaySubdivisionCode(subdivision.code))
      .filter((code) => configuredCodes.has(code))
      .map((code) => ({
        code,
        name: getHolidaySubdivisionName(code),
      }));
    
    // Nur bundesweite ODER konfigurierte regionale Feiertage
    if (!(isNational && config.public.includeNationwide) && states.length === 0) continue;
    
    holidays.push({
      date: holiday.startDate,
      name: germanName,
      type: isNational ? 'national' : config.public.regionalType,
      nationwide: isNational,
      states: isNational ? [] : states,
    });
  }
  
  // Sortieren nach Datum
  holidays.sort((a, b) => a.date.localeCompare(b.date));
  
  return holidays;
}

/**
 * Holt Feiertage mit Caching
 */
async function getHolidays(year: number): Promise<PublicHoliday[]> {
  const cached = holidayCache.get(year);
  
  if (cached && Date.now() - cached.timestamp < getHolidayCacheDurationMs()) {
    return cached.data;
  }
  
  const holidays = await fetchHolidaysFromAPI(year);
  holidayCache.set(year, { data: holidays, timestamp: Date.now() });
  
  return holidays;
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  
  const year = parseInt(query.year as string);
  const week = query.week ? parseInt(query.week as string) : null;
  
  if (!year || isNaN(year)) {
    throw createError({
      statusCode: 400,
      message: 'Parameter "year" ist erforderlich'
    });
  }
  
  try {
    let holidays = await getHolidays(year);
    
    // Optional: Auf Kalenderwoche filtern
    if (week && !isNaN(week)) {
      const { start, end } = getWeekDateRange(year, week);
      
      // Auch Vorjahr und Folgejahr laden für KW 1 / KW 52
      const prevYear = await getHolidays(year - 1);
      const nextYear = await getHolidays(year + 1);
      const allHolidays = [...prevYear, ...holidays, ...nextYear];
      
      holidays = allHolidays.filter(h => h.date >= start && h.date <= end);
    }
    
    return holidays;
  } catch (error: any) {
    console.error('Fehler beim Abrufen der Feiertage:', error);
    throw createError({
      statusCode: 500,
      message: `Fehler beim Abrufen der Feiertage: ${error.message}`
    });
  }
});
