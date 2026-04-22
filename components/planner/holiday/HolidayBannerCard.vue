<script setup lang="ts">
import type { PublicHoliday, SchoolHolidayPeriod } from "~/types/holiday";
import { buildHolidayBannerItems } from "~/utils/holiday";

const props = defineProps<{
  holidays: PublicHoliday[];
  schoolHolidays: SchoolHolidayPeriod[];
}>();

const bannerTitle = computed(() => {
  if (props.holidays.length > 0 && props.schoolHolidays.length > 0) return "Kalenderlage";
  if (props.holidays.length > 0) return "Feiertage";
  return "Schulferien";
});

const bannerTone = computed(() => {
  if (props.holidays.length > 0 && props.schoolHolidays.length > 0) {
    return "planner-holiday-banner--mixed";
  }

  return props.holidays.length > 0
    ? "planner-holiday-banner--holiday"
    : "planner-holiday-banner--school";
});

const bannerItems = computed(() => buildHolidayBannerItems(props.holidays, props.schoolHolidays));
</script>

<template>
  <div class="planner-holiday-banner" :class="bannerTone">
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
</template>
