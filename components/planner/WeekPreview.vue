<script setup lang="ts">
import { useAppStore } from "~/stores/app.store";
import { previewKey, useWeekPreviewData } from "~/composables/useWeekPreviewData";

// `revision` counts saved changes on the plan page, so the next weeks reload with them.
const props = withDefaults(defineProps<{ revision?: number }>(), { revision: 0 });
const appStore = useAppStore();

const previewWeekCount = 3;
const upcomingWeeks = computed(() => appStore.getUpcomingWeeks(previewWeekCount));
const { plans, loading } = useWeekPreviewData(
  upcomingWeeks,
  computed(() => props.revision)
);

function goToWeek(year: number, week: number) {
  appStore.setWeek(year, week);
  window.scrollTo({ top: 0, behavior: "smooth" });
}
</script>

<template>
  <section>
    <div class="planner-section-heading !mb-3">
      <h3 class="text-sm font-semibold text-[var(--text-1)]">{{ $t("planner.week.preview.title") }}</h3>
    </div>

    <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
      <WeekPreviewCard
        v-for="week in upcomingWeeks"
        :key="previewKey(week)"
        :week="week"
        :plan="plans[previewKey(week)]"
        :loading="loading"
        @select="goToWeek(week.year, week.week)"
      />
    </div>
  </section>
</template>
