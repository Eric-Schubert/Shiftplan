




import { ref, computed, watch, type Ref } from 'vue';
import type { PublicHoliday } from "~/types/holiday";


const holidayCache = new Map<string, PublicHoliday[]>();




async function fetchHolidays(year: number, week?: number): Promise<PublicHoliday[]> {
  const cacheKey = week ? `${year}-${week}` : `${year}`;


  if (holidayCache.has(cacheKey)) {
    return holidayCache.get(cacheKey)!;
  }


  const params = new URLSearchParams({ year: year.toString() });
  if (week) params.append('week', week.toString());

  const response = await $fetch<PublicHoliday[]>(`/api/holidays/public?${params}`);


  holidayCache.set(cacheKey, response);

  return response;
}




export function useHolidays() {
  const loading = ref(false);
  const error = ref<string | null>(null);




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




  async function isHoliday(date: Date | string): Promise<PublicHoliday | null> {
    const dateStr = typeof date === 'string' ? date : date.toISOString().slice(0, 10);
    const year = new Date(dateStr).getFullYear();

    const holidays = await getHolidaysForYear(year);
    return holidays.find(h => h.date === dateStr) || null;
  }




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




export function useHolidaysReactive(
  year: Ref<number>,
  week: Ref<number>
) {
  const holidays = ref<PublicHoliday[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const { getHolidaysForWeek } = useHolidays();


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
