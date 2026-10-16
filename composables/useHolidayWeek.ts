import { reactive, type Ref } from "vue";
import type { PublicHoliday, SchoolHolidayPeriod } from "~/types/holiday";

interface HolidayWeekEntry {
  holidays: PublicHoliday[];
  schoolHolidays: SchoolHolidayPeriod[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
}

const holidayWeekCache = reactive<Record<string, HolidayWeekEntry>>({});
const holidayWeekRequests = new Map<string, Promise<void>>();

function getCacheKey(year: number, week: number) {
  return `${year}-${week}`;
}

function emptyEntry(): HolidayWeekEntry {
  return { holidays: [], schoolHolidays: [], loading: true, loaded: false, error: null };
}

function ensureCacheEntry(key: string): HolidayWeekEntry {
  if (!holidayWeekCache[key]) {
    holidayWeekCache[key] = emptyEntry();
  }

  return holidayWeekCache[key];
}

/**
 * The entry a component shows. The server renders without holidays (they load in the browser) and
 * must not cache anything: the cache lives as long as the process and every deep-linked week would stay in it.
 */
export function holidayWeekEntry(key: string, server = import.meta.server): HolidayWeekEntry {
  return server ? emptyEntry() : ensureCacheEntry(key);
}

/** Weeks in the cache; for tests. */
export function cachedHolidayWeeks(): string[] {
  return Object.keys(holidayWeekCache);
}

async function loadHolidayWeek(year: number, week: number) {
  if (import.meta.server) {
    return;
  }

  const key = getCacheKey(year, week);
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
      query: { year, week },
    }),
  ])
    .then(([holidays, school]) => {
      entry.holidays = holidays;
      entry.schoolHolidays = school.grouped || [];
      entry.loaded = true;
    })
    .catch((error: { message?: string }) => {
      // An empty message falls back to the catalog text in useHolidayWeek.
      entry.error = error.message || "";
      entry.loaded = false;
    })
    .finally(() => {
      entry.loading = false;
      holidayWeekRequests.delete(key);
    });

  holidayWeekRequests.set(key, request);
  await request;
}

export function useHolidayWeek(year: number | Ref<number>, week: number | Ref<number>) {
  const resolvedYear = computed(() => unref(year));
  const resolvedWeek = computed(() => unref(week));
  const cacheKey = computed(() => getCacheKey(resolvedYear.value, resolvedWeek.value));
  const entry = computed(() => holidayWeekEntry(cacheKey.value));
  const { t } = useI18n();

  watch(
    () => [resolvedYear.value, resolvedWeek.value],
    () => {
      void loadHolidayWeek(resolvedYear.value, resolvedWeek.value);
    },
    { immediate: true }
  );

  return {
    holidays: computed(() => entry.value.holidays),
    schoolHolidays: computed(() => entry.value.schoolHolidays),
    loading: computed(() => entry.value.loading),
    error: computed(() => (entry.value.error === null ? null : entry.value.error || t("holidays.loadFailed"))),
  };
}
