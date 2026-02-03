/**
 * Composable für Schulferien
 * 
 * Nutzt die interne API (/api/holidays/school), die wiederum
 * die OpenHolidays API (https://openholidaysapi.org) abfragt.
 * 
 * Features:
 * - Schulferien für Sachsen (SN) und Brandenburg (BB)
 * - Automatisches Caching auf Client-Seite
 * - Gruppierung nach Ferienname für übersichtliche Anzeige
 */

import { ref, computed, watch, type Ref } from 'vue';

export interface SchoolHoliday {
  name: string;        // Name der Ferien (z.B. "Winterferien")
  start: string;       // Start-Datum ISO YYYY-MM-DD
  end: string;         // End-Datum ISO YYYY-MM-DD
  state: string;       // Bundesland-Kürzel (SN, BB)
  stateName: string;   // Voller Name des Bundeslandes
}

export interface SchoolHolidayPeriod {
  name: string;
  start: string;
  end: string;
  states: Array<{ code: string; name: string }>;
}

interface SchoolHolidayResponse {
  holidays: SchoolHoliday[];
  grouped: SchoolHolidayPeriod[];
}

// Client-seitiger Cache
const schoolHolidayCache = new Map<string, SchoolHolidayResponse>();

/**
 * Holt Schulferien vom Server (mit Client-Cache)
 */
async function fetchSchoolHolidays(
  year: number, 
  week?: number, 
  states: string[] = ['SN', 'BB']
): Promise<SchoolHolidayResponse> {
  const cacheKey = week ? `${year}-${week}-${states.join(',')}` : `${year}-${states.join(',')}`;
  
  // Cache prüfen
  if (schoolHolidayCache.has(cacheKey)) {
    return schoolHolidayCache.get(cacheKey)!;
  }
  
  // Von API laden
  const params = new URLSearchParams({ 
    year: year.toString(),
    states: states.join(',')
  });
  if (week) params.append('week', week.toString());
  
  const response = await $fetch<SchoolHolidayResponse>(`/api/holidays/school?${params}`);
  
  // Cachen
  schoolHolidayCache.set(cacheKey, response);
  
  return response;
}

/**
 * Formatiert einen Zeitraum für die Anzeige
 */
export function formatHolidayPeriod(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  const formatOptions: Intl.DateTimeFormatOptions = { 
    day: '2-digit', 
    month: '2-digit' 
  };
  
  const startStr = startDate.toLocaleDateString('de-DE', formatOptions);
  const endStr = endDate.toLocaleDateString('de-DE', formatOptions);
  
  if (start === end) {
    return startStr;
  }
  
  return `${startStr} - ${endStr}`;
}

/**
 * Vue Composable für Schulferien
 */
export function useSchoolHolidays() {
  const loading = ref(false);
  const error = ref<string | null>(null);
  
  /**
   * Holt alle Schulferien für ein Jahr
   */
  async function getSchoolHolidaysForYear(
    year: number, 
    states?: string[]
  ): Promise<SchoolHolidayResponse> {
    loading.value = true;
    error.value = null;
    
    try {
      return await fetchSchoolHolidays(year, undefined, states);
    } catch (e: any) {
      error.value = e.message || 'Fehler beim Laden der Schulferien';
      console.error('useSchoolHolidays error:', e);
      return { holidays: [], grouped: [] };
    } finally {
      loading.value = false;
    }
  }
  
  /**
   * Holt Schulferien für eine bestimmte Kalenderwoche
   */
  async function getSchoolHolidaysForWeek(
    year: number, 
    week: number,
    states?: string[]
  ): Promise<SchoolHolidayPeriod[]> {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await fetchSchoolHolidays(year, week, states);
      return response.grouped;
    } catch (e: any) {
      error.value = e.message || 'Fehler beim Laden der Schulferien';
      console.error('useSchoolHolidays error:', e);
      return [];
    } finally {
      loading.value = false;
    }
  }
  
  /**
   * Prüft ob ein Datum in den Schulferien liegt
   */
  async function isSchoolHoliday(
    date: Date | string, 
    state?: string
  ): Promise<SchoolHoliday | null> {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    const year = new Date(dateStr).getFullYear();
    
    const states = state ? [state] : undefined;
    const { holidays } = await getSchoolHolidaysForYear(year, states);
    
    return holidays.find(h => dateStr >= h.start && dateStr <= h.end) || null;
  }
  
  /**
   * Cache leeren
   */
  function clearCache() {
    schoolHolidayCache.clear();
  }
  
  return {
    loading,
    error,
    getSchoolHolidaysForYear,
    getSchoolHolidaysForWeek,
    isSchoolHoliday,
    formatHolidayPeriod,
    clearCache
  };
}

/**
 * Reaktives Composable mit Auto-Fetch
 */
export function useSchoolHolidaysReactive(
  year: Ref<number>, 
  week: Ref<number>,
  states: string[] = ['SN', 'BB']
) {
  const holidays = ref<SchoolHolidayPeriod[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  
  const { getSchoolHolidaysForWeek } = useSchoolHolidays();
  
  // Auto-fetch bei Änderungen
  watch(
    [year, week],
    async ([newYear, newWeek]) => {
      loading.value = true;
      error.value = null;
      
      try {
        holidays.value = await getSchoolHolidaysForWeek(newYear, newWeek, states);
      } catch (e: any) {
        error.value = e.message;
        holidays.value = [];
      } finally {
        loading.value = false;
      }
    },
    { immediate: true }
  );
  
  return {
    holidays: computed(() => holidays.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value)
  };
}
