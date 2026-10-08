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
      <WeekPreviewCard
        v-for="week in upcomingWeeks"
        :key="`${week.year}-${week.week}`"
        :week="week"
        :plan="previewData[`${week.year}-${week.week}`]"
        :loading="loading"
        @select="goToWeek(week.year, week.week)"
      />
    </div>
  </section>
</template>
