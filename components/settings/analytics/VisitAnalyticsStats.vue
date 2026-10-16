<script setup lang="ts">
import type { AnalyticsSummary } from "~/types/analytics";
import { formatDay } from "~/shared/utils/format/day";
import { formatNumber } from "~/shared/utils/format/number";

defineProps<{
  summary: AnalyticsSummary;
}>();
const { locale } = useI18n();
</script>

<template>
  <div class="planner-stat-grid">
    <div class="planner-stat">
      <span class="planner-stat-label">Heute</span>
      <span class="planner-stat-value">{{ formatNumber(locale, summary.totals.todayPageViews) }}</span>
      <span class="planner-stat-note">
        {{ formatNumber(locale, summary.totals.todayUniqueVisitors) }} individuelle Zugriffe
      </span>
    </div>

    <div class="planner-stat">
      <span class="planner-stat-label">Gestern</span>
      <span class="planner-stat-value">{{ formatNumber(locale, summary.totals.yesterdayPageViews) }}</span>
      <span class="planner-stat-note">
        {{ formatNumber(locale, summary.totals.yesterdayUniqueVisitors) }} individuelle Zugriffe
      </span>
    </div>

    <div class="planner-stat">
      <span class="planner-stat-label">Zeitraum</span>
      <span class="planner-stat-value">{{ formatNumber(locale, summary.totals.pageViews) }}</span>
      <span class="planner-stat-note">
        {{ formatNumber(locale, summary.totals.uniqueVisitorDays) }} individuelle Tageszugriffe
      </span>
    </div>

    <div class="planner-stat">
      <span class="planner-stat-label">Schnitt pro Tag</span>
      <span class="planner-stat-value">{{ formatNumber(locale, summary.totals.averagePageViewsPerDay, 1) }}</span>
      <span class="planner-stat-note">
        {{ formatDay(locale, summary.startDate, "date") }} bis {{ formatDay(locale, summary.endDate, "date") }}
      </span>
    </div>
  </div>
</template>
