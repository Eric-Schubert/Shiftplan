<script setup lang="ts">
import type { PublicHoliday, SchoolHolidayPeriod } from "~/types/holiday";
import { formatHolidayDate, formatHolidayPeriod } from "~/utils/holiday";

defineProps<{
  holidays: PublicHoliday[];
  schoolHolidays: SchoolHolidayPeriod[];
}>();
</script>

<template>
  <div class="space-y-4">
    <div v-if="holidays.length > 0">
      <p class="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--text-3)]">
        <i class="pi pi-calendar text-[0.7rem] text-[var(--danger-ink)]" aria-hidden="true"></i>
        Feiertage
      </p>

      <ul class="divide-y divide-[var(--border-soft)]">
        <li
          v-for="holiday in holidays"
          :key="holiday.date"
          class="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0"
        >
          <div class="flex min-w-0 items-start gap-2">
            <span
              class="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"
              :class="holiday.type === 'national' ? 'bg-rose-500' : 'bg-amber-500'"
              aria-hidden="true"
            ></span>
            <div class="min-w-0">
              <p class="text-sm font-medium leading-5 text-[var(--text-1)]">{{ holiday.name }}</p>
              <div v-if="holiday.states.length > 0" class="mt-1 flex flex-wrap gap-1">
                <span
                  v-for="state in holiday.states"
                  :key="`${holiday.date}-${state.code}`"
                  class="rounded bg-[var(--warning-soft)] px-1.5 text-[0.6875rem] font-semibold text-[var(--warning-ink)]"
                >
                  {{ state.code }}
                </span>
              </div>
            </div>
          </div>
          <span class="flex-shrink-0 text-xs tabular-nums text-[var(--text-3)]">
            {{ formatHolidayDate(holiday.date) }}
          </span>
        </li>
      </ul>
    </div>

    <div v-if="schoolHolidays.length > 0">
      <p class="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--text-3)]">
        <i class="pi pi-book text-[0.7rem] text-[var(--info-ink)]" aria-hidden="true"></i>
        Schulferien
      </p>

      <ul class="divide-y divide-[var(--border-soft)]">
        <li
          v-for="period in schoolHolidays"
          :key="`${period.name}-${period.start}`"
          class="py-2 first:pt-0 last:pb-0"
        >
          <div class="flex items-start justify-between gap-3">
            <p class="text-sm font-medium leading-5 text-[var(--text-1)]">{{ period.name }}</p>
            <span class="flex-shrink-0 text-xs tabular-nums text-[var(--text-3)]">
              {{ formatHolidayPeriod(period.start, period.end) }}
            </span>
          </div>
          <div class="mt-1 flex flex-wrap gap-1">
            <span
              v-for="state in period.states"
              :key="state.code"
              class="rounded bg-[var(--info-soft)] px-1.5 text-[0.6875rem] font-semibold text-[var(--info-ink)]"
            >
              {{ state.name }}
            </span>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
