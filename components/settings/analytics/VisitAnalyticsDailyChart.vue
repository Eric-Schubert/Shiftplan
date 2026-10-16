<script setup lang="ts">
import type { AnalyticsDailyMetric } from "~/types/analytics";
import { formatDay } from "~/shared/utils/format/day";
import { formatNumber } from "~/shared/utils/format/number";

const props = defineProps<{
  daily: AnalyticsDailyMetric[];
}>();
const localeTag = useLocaleTag();

const maxDailyPageViews = computed(() => Math.max(1, ...props.daily.map((day) => day.pageViews)));
const latestDaily = computed(() => props.daily.slice(-14));

function barStyle(day: AnalyticsDailyMetric): Record<string, string> {
  if (day.pageViews <= 0) return { height: "0.35rem" };
  const percent = Math.max(12, Math.round((day.pageViews / maxDailyPageViews.value) * 100));
  return { height: `${percent}%` };
}
</script>

<template>
  <section class="planner-panel !p-0 min-w-0 max-w-full overflow-hidden">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-soft)] px-4 py-3">
      <div>
        <p class="planner-kicker">Tagesverlauf</p>
        <h4 class="mt-1 text-base font-semibold text-[var(--text-1)]">
          Letzte {{ latestDaily.length }} Tage
        </h4>
      </div>
      <span class="planner-chip planner-chip--muted">
        {{ formatNumber(localeTag, maxDailyPageViews) }} max.
      </span>
    </div>

    <div class="max-w-full overflow-x-auto px-4 pb-4 pt-5">
      <div class="flex h-56 min-w-[34rem] items-end gap-2 sm:min-w-[42rem]">
        <div
          v-for="day in latestDaily"
          :key="day.date"
          class="flex h-full flex-1 flex-col justify-end gap-2"
          :title="`${formatDay(localeTag, day.date, 'intl')}: ${day.pageViews} Aufrufe, ${day.uniqueVisitors} individuell`"
        >
          <div class="flex min-h-0 flex-1 items-end">
            <div
              class="w-full rounded-t-lg border border-[var(--border-soft)] bg-[var(--accent-soft)] transition"
              :class="day.pageViews > 0 ? 'bg-[var(--accent-soft)]' : 'bg-[var(--surface-strong)]'"
              :style="barStyle(day)"
            ></div>
          </div>
          <div class="text-center">
            <span class="block text-xs font-semibold text-[var(--text-1)]">
              {{ formatNumber(localeTag, day.pageViews) }}
            </span>
            <span class="block text-[0.68rem] font-semibold text-[var(--text-3)]">
              {{ formatDay(localeTag, day.date, "date") }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
