<script setup lang="ts">
import type { PublicHoliday, SchoolHolidayPeriod } from "~/types/holiday";
import { formatHolidayDate, formatHolidayPeriod } from "~/utils/holiday";

defineProps<{
  holidays: PublicHoliday[];
  schoolHolidays: SchoolHolidayPeriod[];
}>();
</script>

<template>
  <div class="space-y-3">
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
              v-for="state in holiday.states"
              :key="`${holiday.date}-${state.code}`"
              class="rounded-full bg-[var(--warning-soft)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--warning-ink)]"
            >
              {{ state.code }}
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
  </div>
</template>
