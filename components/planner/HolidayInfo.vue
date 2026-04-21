<script setup lang="ts">
interface Props {
  year: number;
  week: number;
  compact?: boolean;
  banner?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  banner: false,
});

const { holidays, schoolHolidays, loading, error } = useHolidayWeek(
  toRef(props, "year"),
  toRef(props, "week")
);

const hasContent = computed(() => holidays.value.length > 0 || schoolHolidays.value.length > 0);

const bannerTitle = computed(() => {
  if (holidays.value.length > 0 && schoolHolidays.value.length > 0) return "Kalenderlage";
  if (holidays.value.length > 0) return "Feiertage";
  return "Schulferien";
});

const bannerTone = computed(() => {
  if (holidays.value.length > 0 && schoolHolidays.value.length > 0) return "planner-holiday-banner--mixed";
  return holidays.value.length > 0 ? "planner-holiday-banner--holiday" : "planner-holiday-banner--school";
});

const bannerItems = computed(() => {
  const holidayItems = holidays.value.map((holiday) => ({
    key: `holiday-${holiday.date}-${holiday.name}`,
    label: holiday.name,
    meta: formatHolidayDate(holiday.date),
    tone: holiday.type === "national" ? "holiday" : "warning",
    states: [] as string[],
  }));

  const schoolItems = schoolHolidays.value.map((period) => ({
    key: `school-${period.name}-${period.start}`,
    label: period.name,
    meta: formatHolidayPeriod(period.start, period.end),
    tone: "school",
    states: period.states.map((state) => state.name),
  }));

  return [...holidayItems, ...schoolItems];
});

function formatHolidayDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function formatHolidayPeriod(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const formatDate = (date: Date) => date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

function shortenHolidayName(name: string): string {
  const shortNames: Record<string, string> = {
    Neujahr: "Neujahr",
    "Tag der Arbeit": "1. Mai",
    "Tag der Deutschen Einheit": "Einheit",
    "1. Weihnachtstag": "1. Weihn.",
    "2. Weihnachtstag": "2. Weihn.",
    "Erster Weihnachtstag": "1. Weihn.",
    "Zweiter Weihnachtstag": "2. Weihn.",
    Karfreitag: "Karfreitag",
    Ostersonntag: "Ostern",
    Ostermontag: "Ostermo.",
    "Christi Himmelfahrt": "Himmelfahrt",
    Pfingstsonntag: "Pfingsten",
    Pfingstmontag: "Pfingstmo.",
    "Buß- und Bettag": "Buß+Bettag",
    Reformationstag: "Reformation",
  };
  return shortNames[name] || name;
}
</script>

<template>
  <div v-if="loading && !hasContent" class="flex items-center gap-2 text-sm text-[var(--text-2)]">
    <i class="pi pi-spin pi-spinner"></i>
    <span v-if="!compact && !banner">Kalenderhinweise werden geladen.</span>
  </div>

  <div
    v-else-if="error && !hasContent && !banner"
    class="rounded-[18px] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--danger-ink)]"
  >
    <span v-if="!compact">{{ error }}</span>
  </div>

  <div
    v-else-if="banner && hasContent"
    class="planner-holiday-banner"
    :class="bannerTone"
  >
    <div class="planner-holiday-banner__header">
      <div class="flex items-center gap-2">
        <span class="planner-holiday-banner__icon">
          <i :class="holidays.length > 0 ? 'pi pi-calendar' : 'pi pi-book'" class="text-xs"></i>
        </span>
        <div>
          <p class="planner-kicker">{{ bannerTitle }}</p>
        </div>
      </div>
      <span class="planner-chip planner-chip--muted !min-h-8 !px-3 !py-1 text-[11px]">Diese Woche</span>
    </div>

    <div class="space-y-2">
      <div
        v-for="item in bannerItems"
        :key="item.key"
        class="planner-holiday-banner__row"
      >
        <div class="flex min-w-0 flex-1 items-start gap-2">
          <span
            class="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
            :class="{
              'bg-rose-500': item.tone === 'holiday',
              'bg-amber-500': item.tone === 'warning',
              'bg-sky-500': item.tone === 'school',
            }"
          ></span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-[var(--text-1)]">{{ item.label }}</p>
            <div v-if="item.states.length > 0" class="mt-2 flex flex-wrap gap-1.5">
              <span
                v-for="state in item.states"
                :key="`${item.key}-${state}`"
                class="planner-holiday-banner__state"
              >
                {{ state }}
              </span>
            </div>
          </div>
        </div>
        <span class="flex-shrink-0 text-xs text-[var(--text-2)]">{{ item.meta }}</span>
      </div>
    </div>
  </div>

  <div v-else-if="hasContent" :class="compact ? 'space-y-2' : 'space-y-3'">
    <template v-if="compact">
      <div
        v-for="holiday in holidays"
        :key="holiday.date"
        class="flex items-center gap-2 rounded-full bg-[var(--surface-muted)] px-2.5 py-1.5 text-xs text-[var(--text-2)]"
      >
        <span
          class="h-2 w-2 flex-shrink-0 rounded-full"
          :class="holiday.type === 'national' ? 'bg-rose-500' : 'bg-amber-500'"
        ></span>
        <span class="truncate">{{ shortenHolidayName(holiday.name) }}</span>
      </div>

      <div
        v-for="period in schoolHolidays"
        :key="`${period.name}-${period.start}`"
        class="flex items-center gap-2 rounded-full bg-[var(--surface-muted)] px-2.5 py-1.5 text-xs text-[var(--text-2)]"
      >
        <span class="h-2 w-2 flex-shrink-0 rounded-full bg-sky-500"></span>
        <span class="truncate">
          {{ period.name }}
          <span class="text-[10px] text-[var(--text-3)]">
            ({{ period.states.map((state) => state.code).join("/") }})
          </span>
        </span>
      </div>
    </template>

    <template v-else>
      <div
        v-if="holidays.length > 0"
        class="rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-4"
      >
        <div class="mb-3 flex items-center gap-2">
          <span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--danger-soft)] text-[var(--danger-ink)]">
            <i class="pi pi-calendar text-xs"></i>
          </span>
          <div>
            <p class="planner-kicker">Feiertage</p>
            <h4 class="mt-1 text-sm font-semibold text-[var(--text-1)]">Wichtige Kalendereinträge</h4>
          </div>
        </div>

        <div class="space-y-2">
          <div
            v-for="holiday in holidays"
            :key="holiday.date"
            class="flex items-center justify-between gap-3 rounded-[16px] bg-[var(--surface-muted)] px-3 py-2"
          >
            <div class="flex min-w-0 items-center gap-2">
              <span
                class="h-2 w-2 flex-shrink-0 rounded-full"
                :class="holiday.type === 'national' ? 'bg-rose-500' : 'bg-amber-500'"
              ></span>
              <span class="truncate text-sm font-medium text-[var(--text-1)]">{{ holiday.name }}</span>
              <span
                v-if="holiday.type === 'saxony'"
                class="rounded-full bg-[var(--warning-soft)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--warning-ink)]"
              >
                SN
              </span>
            </div>
            <span class="flex-shrink-0 text-xs text-[var(--text-3)]">
              {{ formatHolidayDate(holiday.date) }}
            </span>
          </div>
        </div>
      </div>

      <div
        v-if="schoolHolidays.length > 0"
        class="rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-4"
      >
        <div class="mb-3 flex items-center gap-2">
          <span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
            <i class="pi pi-book text-xs"></i>
          </span>
          <div>
            <p class="planner-kicker">Schulferien</p>
            <h4 class="mt-1 text-sm font-semibold text-[var(--text-1)]">Relevante Ferienzeiten</h4>
          </div>
        </div>

        <div class="space-y-2">
          <div
            v-for="period in schoolHolidays"
            :key="`${period.name}-${period.start}`"
            class="rounded-[16px] bg-[var(--surface-muted)] px-3 py-3"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-medium text-[var(--text-1)]">{{ period.name }}</p>
                <div class="mt-2 flex flex-wrap gap-1.5">
                  <span
                    v-for="state in period.states"
                    :key="state.code"
                    class="rounded-full bg-sky-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
                  >
                    {{ state.name }}
                  </span>
                </div>
              </div>
              <span class="flex-shrink-0 text-xs text-[var(--text-3)]">
                {{ formatHolidayPeriod(period.start, period.end) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>

  <div
    v-else-if="!banner"
    class="rounded-[20px] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-4 py-5 text-sm text-[var(--text-2)]"
  >
    Keine Feiertage oder Ferien in dieser Kalenderwoche.
  </div>
</template>
