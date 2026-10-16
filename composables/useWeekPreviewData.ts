import { ref, watch, type Ref } from "vue";
import type { WeeklyShiftplan } from "~/types/shiftplan";
import { latestRequest } from "~/utils/latest-request";

/** A loaded week, or `failed` when it could not be loaded, which is not the same as not planned. */
export type PreviewWeek = WeeklyShiftplan | "failed";

export function previewKey(week: { year: number; week: number }): string {
  return `${week.year}-${week.week}`;
}

/**
 * Plans of the weeks after the selected one. They reload when the selection moves and when
 * `revision` counts a saved change; only the newest load is kept.
 */
export function useWeekPreviewData(weeks: Ref<Array<{ year: number; week: number }>>, revision: Ref<number>) {
  const plans = ref<Record<string, PreviewWeek>>({});
  const loading = ref(true);
  const requests = latestRequest();

  async function load() {
    const request = requests.start();
    // A reload after a change keeps the cards; only weeks not shown yet get the skeleton.
    loading.value = weeks.value.some((week) => !(previewKey(week) in plans.value));

    const entries = await Promise.all(
      weeks.value.map(async (week) => {
        try {
          return [previewKey(week), await $fetch<WeeklyShiftplan>("/api/shiftplan", { query: { year: week.year, week: week.week } })] as const;
        } catch {
          return [previewKey(week), "failed"] as const;
        }
      })
    );

    if (!requests.isLatest(request)) return;
    plans.value = Object.fromEntries(entries);
    loading.value = false;
  }

  watch([() => weeks.value.map(previewKey).join(), revision], () => load(), { immediate: true });

  return { plans, loading, reload: load };
}
