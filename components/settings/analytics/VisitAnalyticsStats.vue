<script setup lang="ts">
import type { AnalyticsSummary } from "~/types/analytics";
import { formatDay } from "~/shared/utils/format/day";
import { formatNumber } from "~/shared/utils/format/number";

defineProps<{
  summary: AnalyticsSummary;
}>();
const localeTag = useLocaleTag();
const { t } = useI18n();
</script>

<template>
  <div class="planner-stat-grid">
    <div class="planner-stat">
      <span class="planner-stat-label">{{ t("settings.analytics.stats.today") }}</span>
      <span class="planner-stat-value">{{ formatNumber(localeTag, summary.totals.todayPageViews) }}</span>
      <span class="planner-stat-note">
        {{ t("settings.analytics.uniqueVisits", { count: formatNumber(localeTag, summary.totals.todayUniqueVisitors) }) }}
      </span>
    </div>

    <div class="planner-stat">
      <span class="planner-stat-label">{{ t("settings.analytics.stats.yesterday") }}</span>
      <span class="planner-stat-value">{{ formatNumber(localeTag, summary.totals.yesterdayPageViews) }}</span>
      <span class="planner-stat-note">
        {{ t("settings.analytics.uniqueVisits", { count: formatNumber(localeTag, summary.totals.yesterdayUniqueVisitors) }) }}
      </span>
    </div>

    <div class="planner-stat">
      <span class="planner-stat-label">{{ t("settings.analytics.period") }}</span>
      <span class="planner-stat-value">{{ formatNumber(localeTag, summary.totals.pageViews) }}</span>
      <span class="planner-stat-note">
        {{ t("settings.analytics.uniqueVisitorDays", { count: formatNumber(localeTag, summary.totals.uniqueVisitorDays) }) }}
      </span>
    </div>

    <div class="planner-stat">
      <span class="planner-stat-label">{{ t("settings.analytics.stats.average") }}</span>
      <span class="planner-stat-value">{{ formatNumber(localeTag, summary.totals.averagePageViewsPerDay, 1) }}</span>
      <span class="planner-stat-note">
        {{
          t("settings.range", {
            from: formatDay(localeTag, summary.startDate, "date"),
            to: formatDay(localeTag, summary.endDate, "date"),
          })
        }}
      </span>
    </div>
  </div>
</template>
