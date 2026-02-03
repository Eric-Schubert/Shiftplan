/**
 * Composable für deutsche Feiertage
 * 
 * Nutzt die interne API (/api/holidays/public), die wiederum
 * die OpenHolidays API (https://openholidaysapi.org) abfragt.
 * 
 * Features:
 * - Bundesweite deutsche Feiertage
 * - Sächsische Feiertage (Buß- und Bettag, Reformationstag)
 * - Automatisches Caching auf Client-Seite
 */

import { ref, computed, watch, type Ref } from 'vue';

export interface PublicHoliday {
  date: string;        // ISO date string YYYY-MM-DD
  name: string;        // Name des Feiertags
  type: 'national' | 'saxony';  // Bundesweit oder nur Sachsen
  nationwide: boolean;
}

// Client-seitiger Cache
const holidayCache = new Map<string, PublicHoliday[]>();

/**
 * Holt Feiertage vom Server (mit Client-Cache)
 */
async function fetchHolidays(year: number, week?: number): Promise<PublicHoliday[]> {
  const cacheKey = week ? `${year}-${week}` : `${year}`;
  
  // Cache prüfen
  if (holidayCache.has(cacheKey)) {
    return holidayCache.get(cacheKey)!;
  }
  
  // Von API laden
  const params = new URLSearchParams({ year: year.toString() });
  if (week) params.append('week', week.toString());
  
  const response = await $fetch<PublicHoliday[]>(`/api/holidays/public?${params}`);
  
  // Cachen
  holidayCache.set(cacheKey, response);
  
  return response;
}

/**
 * Vue Composable für Feiertage
 */
export function useHolidays() {
  const loading = ref(false);
  const error = ref<string | null>(null);
  
  /**
   * Holt alle Feiertage für ein Jahr
   */
  async function getHolidaysForYear(year: number): Promise<PublicHoliday[]> {
    loading.value = true;
    error.value = null;
    
    try {
      return await fetchHolidays(year);
    } catch (e: any) {
      error.value = e.message || 'Fehler beim Laden der Feiertage';
      console.error('useHolidays error:', e);
      return [];
    } finally {
      loading.value = false;
    }
  }
  
  /**
   * Holt Feiertage für eine bestimmte Kalenderwoche
   */
  async function getHolidaysForWeek(year: number, week: number): Promise<PublicHoliday[]> {
    loading.value = true;
    error.value = null;
    
    try {
      return await fetchHolidays(year, week);
    } catch (e: any) {
      error.value = e.message || 'Fehler beim Laden der Feiertage';
      console.error('useHolidays error:', e);
      return [];
    } finally {
      loading.value = false;
    }
  }
  
  /**
   * Prüft ob ein Datum ein Feiertag ist
   */
  async function isHoliday(date: Date | string): Promise<PublicHoliday | null> {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    const year = new Date(dateStr).getFullYear();
    
    const holidays = await getHolidaysForYear(year);
    return holidays.find(h => h.date === dateStr) || null;
  }
  
  /**
   * Cache leeren (z.B. bei App-Neustart)
   */
  function clearCache() {
    holidayCache.clear();
  }
  
  return {
    loading,
    error,
    getHolidaysForYear,
    getHolidaysForWeek,
    isHoliday,
    clearCache
  };
}

/**
 * Reaktives Composable mit Auto-Fetch
 * 
 * Lädt Feiertage automatisch wenn sich Jahr/Woche ändern
 */
export function useHolidaysReactive(
  year: Ref<number>, 
  week: Ref<number>
) {
  const holidays = ref<PublicHoliday[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  
  const { getHolidaysForWeek } = useHolidays();
  
  // Auto-fetch bei Änderungen
  watch(
    [year, week],
    async ([newYear, newWeek]) => {
      loading.value = true;
      error.value = null;
      
      try {
        holidays.value = await getHolidaysForWeek(newYear, newWeek);
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
