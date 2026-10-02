<script setup lang="ts">
import { useAppStore } from "~/stores/app.store";
import type { WeeklyShiftplan } from "~/types/shiftplan";
import backendConfig from "../../config/backend.config.json";

const appStore = useAppStore();

const previewWeekCount = 3;
const upcomingWeeks = computed(() => appStore.getUpcomingWeeks(previewWeekCount));

type PreviewWeekData = WeeklyShiftplan | null;

const previewData = ref<Record<string, PreviewWeekData>>({});
const loading = ref(true);

async function loadPreviewWeeks() {
  loading.value = true;

  const responses = await Promise.all(
    upcomingWeeks.value.map(async (week) => {
      const key = `${week.year}-${week.week}`;

      try {
        const response = await $fetch<WeeklyShiftplan>("/api/shiftplan", {
          query: {
            year: week.year,
            week: week.week,
          },
        });

        return [key, response] as const;
      } catch {
        return [key, null] as const;
      }
    })
  );

  previewData.value = Object.fromEntries(responses);
  loading.value = false;
}

watch(
  () => [appStore.selectedYear, appStore.selectedWeek],
  () => loadPreviewWeeks(),
  { immediate: true }
);

function getWeekShifts(year: number, week: number) {
  const key = `${year}-${week}`;
  const data = previewData.value[key];

  if (!data?.shifts || data.shifts.length === 0) {
    return null;
  }

  const shiftsWithStaff = data.shifts
    .filter((shift) => shift.assigned_staff && shift.assigned_staff.length > 0)
    .map((shift) => ({
      name: shift.name,
      color: shift.color || backendConfig.validation.shift.defaultColor,
      staff: shift.assigned_staff.map((staff) => staff.name),
    }));

  return shiftsWithStaff.length > 0 ? shiftsWithStaff : null;
}

function getWeekSummary(year: number, week: number) {
  const key = `${year}-${week}`;
  const data = previewData.value[key];

  if (!data?.shifts) {
    return { shiftCount: 0, assignmentCount: 0 };
  }

  return {
    shiftCount: data.shifts.length,
    assignmentCount: data.shifts.reduce((sum, shift) => sum + shift.assigned_staff.length, 0),
  };
}

function goToWeek(year: number, week: number) {
  appStore.setWeek(year, week);
  window.scrollTo({ top: 0, behavior: "smooth" });
}
</script>

<template>
  <section>
    <div class="planner-section-heading !mb-3">
      <h3 class="text-sm font-semibold text-[var(--text-1)]">Nächste Wochen</h3>
    </div>

    <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
      <button
        v-for="week in upcomingWeeks"
        :key="`${week.year}-${week.week}`"
        type="button"
        class="planner-preview-card flex w-full flex-col text-left"
        @click="goToWeek(week.year, week.week)"
      >
        <div class="planner-preview-card__header flex items-baseline justify-between gap-3 px-4 py-3">
          <div class="flex items-baseline gap-2">
            <h4 class="text-base font-semibold text-[var(--text-1)]">KW {{ week.week }}</h4>
            <span class="text-xs tabular-nums text-[var(--text-3)]">{{ week.dateRange }}</span>
          </div>
          <span class="text-xs tabular-nums text-[var(--text-3)]">
            {{ getWeekSummary(week.year, week.week).assignmentCount }} Zuweisungen
          </span>
        </div>

        <div class="flex flex-1 flex-col gap-3 px-4 py-3">
          <div v-if="loading" class="flex items-center justify-center py-4 text-[var(--text-3)]">
            <i class="pi pi-spin pi-spinner text-sm" aria-hidden="true"></i>
          </div>

          <template v-else>
            <HolidayInfo
              :year="week.year"
              :week="week.week"
              compact
            />

            <ul
              v-if="getWeekShifts(week.year, week.week)"
              class="space-y-2"
            >
              <li
                v-for="shift in getWeekShifts(week.year, week.week)"
                :key="shift.name"
                class="flex items-start gap-2.5"
              >
                <span
                  class="mt-0.5 h-4 w-1 flex-shrink-0 rounded-full"
                  :style="{ backgroundColor: shift.color }"
                  aria-hidden="true"
                ></span>
                <div class="min-w-0 text-[0.8125rem] leading-5">
                  <span class="font-semibold text-[var(--text-1)]">{{ shift.name }}</span>
                  <span class="text-[var(--text-2)]"> · {{ shift.staff.join(", ") }}</span>
                </div>
              </li>
            </ul>

            <p
              v-else
              class="py-2 text-sm text-[var(--text-3)]"
            >
              Noch nicht geplant.
            </p>
          </template>
        </div>
      </button>
    </div>
  </section>
</template>
