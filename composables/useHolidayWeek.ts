import type { Ref } from "vue";

interface PublicHoliday {
  date: string;
  name: string;
  type: "national" | "saxony";
  nationwide: boolean;
}

interface SchoolHolidayPeriod {
  name: string;
  start: string;
  end: string;
  states: Array<{ code: string; name: string }>;
}

interface HolidayWeekEntry {
  holidays: PublicHoliday[];
  schoolHolidays: SchoolHolidayPeriod[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
}

const holidayWeekCache = reactive<Record<string, HolidayWeekEntry>>({});
const holidayWeekRequests = new Map<string, Promise<void>>();

function getCacheKey(year: number, week: number, states: string) {
  return `${year}-${week}-${states}`;
}

function ensureCacheEntry(key: string): HolidayWeekEntry {
  if (!holidayWeekCache[key]) {
    holidayWeekCache[key] = {
      holidays: [],
      schoolHolidays: [],
      loading: false,
      loaded: false,
      error: null,
    };
  }

  return holidayWeekCache[key];
}

async function loadHolidayWeek(year: number, week: number, states: string) {
  if (import.meta.server) {
    return;
  }

  const key = getCacheKey(year, week, states);
  const entry = ensureCacheEntry(key);

  if (entry.loaded && !entry.error) {
    return;
  }

  const existingRequest = holidayWeekRequests.get(key);
  if (existingRequest) {
    await existingRequest;
    return;
  }

  entry.loading = true;
  entry.error = null;

  const request = Promise.all([
    $fetch<PublicHoliday[]>("/api/holidays/public", {
      query: { year, week },
    }),
    $fetch<{ grouped: SchoolHolidayPeriod[] }>("/api/holidays/school", {
      query: { year, week, states },
    }),
  ])
    .then(([holidays, school]) => {
      entry.holidays = holidays;
      entry.schoolHolidays = school.grouped || [];
      entry.loaded = true;
    })
    .catch((error: { message?: string }) => {
      entry.error = error.message || "Feiertage konnten nicht geladen werden";
      entry.loaded = false;
    })
    .finally(() => {
      entry.loading = false;
      holidayWeekRequests.delete(key);
    });

  holidayWeekRequests.set(key, request);
  await request;
}

export function useHolidayWeek(
  year: number | Ref<number>,
  week: number | Ref<number>,
  states = "SN,BB"
) {
  const resolvedYear = computed(() => unref(year));
  const resolvedWeek = computed(() => unref(week));
  const cacheKey = computed(() => getCacheKey(resolvedYear.value, resolvedWeek.value, states));
  const entry = computed(() => ensureCacheEntry(cacheKey.value));

  watch(
    () => [resolvedYear.value, resolvedWeek.value, states],
    () => {
      void loadHolidayWeek(resolvedYear.value, resolvedWeek.value, states);
    },
    { immediate: true }
  );

  return {
    holidays: computed(() => entry.value.holidays),
    schoolHolidays: computed(() => entry.value.schoolHolidays),
    loading: computed(() => entry.value.loading),
    error: computed(() => entry.value.error),
    hasLoaded: computed(() => entry.value.loaded),
  };
}
