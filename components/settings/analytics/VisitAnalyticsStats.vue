<script setup lang="ts">
import type { AnalyticsSummary } from "~/types/analytics";
import { formatAverage, formatDate, formatNumber } from "~/utils/analytics/format";

defineProps<{
  summary: AnalyticsSummary;
}>();
</script>

<template>
  <div class="planner-stat-grid">
    <div class="planner-stat">
      <span class="planner-stat-label">Heute</span>
      <span class="planner-stat-value">{{ formatNumber(summary.totals.todayPageViews) }}</span>
      <span class="planner-stat-note">
        {{ formatNumber(summary.totals.todayUniqueVisitors) }} individuelle Zugriffe
      </span>
    </div>

    <div class="planner-stat">
      <span class="planner-stat-label">Gestern</span>
      <span class="planner-stat-value">{{ formatNumber(summary.totals.yesterdayPageViews) }}</span>
      <span class="planner-stat-note">
        {{ formatNumber(summary.totals.yesterdayUniqueVisitors) }} individuelle Zugriffe
      </span>
    </div>

    <div class="planner-stat">
      <span class="planner-stat-label">Zeitraum</span>
      <span class="planner-stat-value">{{ formatNumber(summary.totals.pageViews) }}</span>
      <span class="planner-stat-note">
        {{ formatNumber(summary.totals.uniqueVisitorDays) }} individuelle Tageszugriffe
      </span>
    </div>

    <div class="planner-stat">
      <span class="planner-stat-label">Schnitt pro Tag</span>
      <span class="planner-stat-value">{{ formatAverage(summary.totals.averagePageViewsPerDay) }}</span>
      <span class="planner-stat-note">
        {{ formatDate(summary.startDate) }} bis {{ formatDate(summary.endDate) }}
      </span>
    </div>
  </div>
</template>
