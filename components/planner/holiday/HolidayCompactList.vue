<script setup lang="ts">
import type { PublicHoliday, SchoolHolidayPeriod } from "~/types/holiday";
import { shortenHolidayName } from "~/utils/holiday";

defineProps<{
  holidays: PublicHoliday[];
  schoolHolidays: SchoolHolidayPeriod[];
}>();
</script>

<template>
  <div class="space-y-2">
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
  </div>
</template>
