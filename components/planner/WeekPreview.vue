<script setup lang="ts">
import { useAppStore } from "~/stores/app.store";
import type { WeeklyShiftplan } from "~/types/shiftplan";

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
      color: shift.color || "#6366f1",
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
  <section class="planner-slab">
    <div class="planner-section-heading">
      <div>
        <p class="planner-kicker">Ausblick</p>
        <h3 class="mt-2 text-xl font-semibold text-[var(--text-1)]">Nächste Wochen</h3>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <button
        v-for="week in upcomingWeeks"
        :key="`${week.year}-${week.week}`"
        type="button"
        class="planner-preview-card flex w-full flex-col text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        @click="goToWeek(week.year, week.week)"
      >
        <div class="planner-preview-card__header px-4 py-3">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="planner-kicker">Kalenderwoche</p>
              <h4 class="mt-2 text-lg font-semibold text-[var(--text-1)]">KW {{ week.week }}</h4>
            </div>
            <span class="rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--text-2)] shadow-sm">
              {{ week.year }}
            </span>
          </div>
          <p class="mt-2 text-sm text-[var(--text-2)]">{{ week.dateRange }}</p>
        </div>

        <div class="flex flex-1 flex-col gap-3 p-4">
          <div class="flex flex-wrap gap-2">
            <span class="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-medium text-[var(--text-2)]">
              {{ getWeekSummary(week.year, week.week).shiftCount }} Schichten
            </span>
            <span class="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-medium text-[var(--text-2)]">
              {{ getWeekSummary(week.year, week.week).assignmentCount }} Zuweisungen
            </span>
          </div>

          <div v-if="loading" class="flex items-center justify-center py-4 text-[var(--text-3)]">
            <i class="pi pi-spin pi-spinner text-sm"></i>
          </div>

          <template v-else>
            <HolidayInfo
              :year="week.year"
              :week="week.week"
              compact
            />

            <div
              v-if="getWeekShifts(week.year, week.week)"
              class="space-y-2"
            >
              <div
                v-for="shift in getWeekShifts(week.year, week.week)"
                :key="shift.name"
                class="flex items-start gap-2 rounded-[16px] bg-[var(--surface-muted)] px-3 py-2"
              >
                <span
                  class="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  :style="{ backgroundColor: shift.color }"
                ></span>
                <div class="min-w-0">
                  <p class="text-xs font-semibold text-[var(--text-1)]">{{ shift.name }}</p>
                  <p class="mt-1 text-xs leading-5 text-[var(--text-1)]/90">
                    {{ shift.staff.join(", ") }}
                  </p>
                </div>
              </div>
            </div>

            <div
              v-else
              class="flex flex-1 items-center rounded-[18px] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-4 py-5 text-sm text-[var(--text-2)]"
            >
              Noch nicht geplant.
            </div>
          </template>
        </div>
      </button>
    </div>
  </section>
</template>
