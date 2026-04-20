/**
 * API Route: /api/holidays/school
 * 
 * Ruft Schulferien von der OpenHolidays API ab.
 * Unterstützt Sachsen (DE-SN) und Brandenburg (DE-BB).
 * 
 * Query Parameter:
 * - year: Jahr (required)
 * - week: Kalenderwoche (optional, filtert auf diese Woche)
 * - states: Komma-separierte Bundesländer (optional, default: "SN,BB")
 */

import { defineEventHandler, getQuery, createError } from 'h3';

// OpenHolidays API Response Type für Schulferien
interface OpenSchoolHolidayResponse {
  id: string;
  startDate: string;
  endDate: string;
  type: string;
  name: Array<{ language: string; text: string }>;
  subdivisions?: Array<{ code: string; shortName: string }>;
}

// Unsere Schulferien-Struktur
export interface SchoolHoliday {
  name: string;
  start: string;
  end: string;
  state: string;
  stateName: string;
}

// Gruppierte Schulferien für die Anzeige
export interface SchoolHolidayPeriod {
  name: string;
  start: string;
  end: string;
  states: Array<{ code: string; name: string }>;
}

// Bundesland-Mapping
const STATE_NAMES: Record<string, string> = {
  'SN': 'Sachsen',
  'BB': 'Brandenburg',
  'DE-SN': 'Sachsen',
  'DE-BB': 'Brandenburg'
};

// Cache für API-Responses
const schoolHolidayCache = new Map<string, { data: SchoolHoliday[]; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 Stunden

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
 * Prüft ob sich zwei Zeiträume überschneiden
 */
function periodsOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  return start1 <= end2 && start2 <= end1;
}

/**
 * Holt Schulferien von der OpenHolidays API für ein Bundesland
 */
async function fetchSchoolHolidaysFromAPI(year: number, stateCode: string): Promise<SchoolHoliday[]> {
  // OpenHolidays braucht das volle ISO-Format (DE-SN)
  const fullStateCode = stateCode.startsWith('DE-') ? stateCode : `DE-${stateCode}`;
  const shortCode = stateCode.replace('DE-', '');
  
  // Zeitraum: Schuljahr geht über zwei Jahre, also großzügig abfragen
  const validFrom = `${year - 1}-07-01`;
  const validTo = `${year + 1}-06-30`;
  
  const url = `https://openholidaysapi.org/SchoolHolidays?countryIsoCode=DE&subdivisionCode=${fullStateCode}&languageIsoCode=DE&validFrom=${validFrom}&validTo=${validTo}`;
  
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  });
  
  if (!response.ok) {
    throw new Error(`OpenHolidays API error: ${response.status}`);
  }
  
  const data: OpenSchoolHolidayResponse[] = await response.json();
  
  // Transformiere die Daten
  const holidays: SchoolHoliday[] = data.map(holiday => {
    const germanName = holiday.name.find(n => n.language === 'DE')?.text 
      || holiday.name[0]?.text 
      || 'Schulferien';
    
    return {
      name: germanName,
      start: holiday.startDate,
      end: holiday.endDate,
      state: shortCode,
      stateName: STATE_NAMES[shortCode] || shortCode
    };
  });
  
  return holidays;
}

/**
 * Holt Schulferien mit Caching
 */
async function getSchoolHolidays(year: number, states: string[]): Promise<SchoolHoliday[]> {
  const cacheKey = `${year}-${states.sort().join(',')}`;
  const cached = schoolHolidayCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  // Parallel für alle Bundesländer abrufen
  const promises = states.map(state => fetchSchoolHolidaysFromAPI(year, state));
  const results = await Promise.all(promises);
  const holidays = results.flat();
  
  // Sortieren nach Startdatum
  holidays.sort((a, b) => a.start.localeCompare(b.start));
  
  schoolHolidayCache.set(cacheKey, { data: holidays, timestamp: Date.now() });
  
  return holidays;
}

/**
 * Gruppiert Schulferien nach Name und Zeitraum
 */
function groupSchoolHolidays(holidays: SchoolHoliday[]): SchoolHolidayPeriod[] {
  const grouped = new Map<string, SchoolHolidayPeriod>();
  
  for (const holiday of holidays) {
    // Key basierend auf Name und ungefährem Zeitraum (gleiche Woche)
    const key = `${holiday.name}-${holiday.start.substring(0, 7)}`;
    
    const existing = grouped.get(key);
    if (existing) {
      // Zeitraum erweitern falls nötig
      if (holiday.start < existing.start) existing.start = holiday.start;
      if (holiday.end > existing.end) existing.end = holiday.end;
      
      // Bundesland hinzufügen falls nicht vorhanden
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
  const statesParam = (query.states as string) || 'SN,BB';
  const states = statesParam.split(',').map(s => s.trim().toUpperCase());
  
  if (!year || isNaN(year)) {
    throw createError({
      statusCode: 400,
      message: 'Parameter "year" ist erforderlich'
    });
  }
  
  try {
    let holidays = await getSchoolHolidays(year, states);
    
    // Optional: Auf Kalenderwoche filtern
    if (week && !isNaN(week)) {
      const { start, end } = getWeekDateRange(year, week);
      holidays = holidays.filter(h => periodsOverlap(start, end, h.start, h.end));
    }
    
    // Gruppieren für bessere Anzeige
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
