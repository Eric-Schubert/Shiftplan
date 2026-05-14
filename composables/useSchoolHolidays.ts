




import { ref, computed, watch, type Ref } from 'vue';
import type { HolidaySubdivision } from "~/types/holiday";

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

interface SchoolHolidayResponse {
  holidays: SchoolHoliday[];
  grouped: SchoolHolidayPeriod[];
}


const schoolHolidayCache = new Map<string, SchoolHolidayResponse>();




async function fetchSchoolHolidays(
  year: number,
  week?: number,
  states?: string[]
): Promise<SchoolHolidayResponse> {
  const statesKey = states?.join(",") || "default";
  const cacheKey = week ? `${year}-${week}-${statesKey}` : `${year}-${statesKey}`;


  if (schoolHolidayCache.has(cacheKey)) {
    return schoolHolidayCache.get(cacheKey)!;
  }


  const params = new URLSearchParams({ year: year.toString() });
  if (states?.length) params.append("states", states.join(","));
  if (week) params.append('week', week.toString());

  const response = await $fetch<SchoolHolidayResponse>(`/api/holidays/school?${params}`);


  schoolHolidayCache.set(cacheKey, response);

  return response;
}




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




export function useSchoolHolidays() {
  const loading = ref(false);
  const error = ref<string | null>(null);




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




  async function isSchoolHoliday(
    date: Date | string,
    state?: string
  ): Promise<SchoolHoliday | null> {
    const dateStr = typeof date === 'string' ? date : date.toISOString().slice(0, 10);
    const year = new Date(dateStr).getFullYear();

    const states = state ? [state] : undefined;
    const { holidays } = await getSchoolHolidaysForYear(year, states);

    return holidays.find(h => dateStr >= h.start && dateStr <= h.end) || null;
  }




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




export function useSchoolHolidaysReactive(
  year: Ref<number>,
  week: Ref<number>,
  states?: string[]
) {
  const holidays = ref<SchoolHolidayPeriod[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const { getSchoolHolidaysForWeek } = useSchoolHolidays();


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
