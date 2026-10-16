<script setup lang="ts">
import type { AnalyticsSummary } from "~/types/analytics";
import { formatLocation, formatPath } from "~/utils/analytics/format";

const localeTag = useLocaleTag();
const { t } = useI18n();
const summary = ref<AnalyticsSummary | null>(null);
const loading = ref(true);
const errorMessage = ref("");
const selectedDays = ref(30);
const dayOptions = [7, 30, 90];

const pageItems = computed(() =>
  (summary.value?.topPages ?? []).map((page) => ({ ...page, key: page.path, label: formatPath(page.path, t("settings.analytics.startPage")) }))
);
const locationItems = computed(() =>
  (summary.value?.locations ?? []).map((location) => ({
    ...location,
    key: `${location.countryCode}-${location.region}-${location.city}`,
    label: formatLocation(localeTag.value, location) ?? t("settings.analytics.unknownLocation"),
  }))
);

async function fetchSummary() {
  loading.value = true;
  errorMessage.value = "";

  try {
    summary.value = await $fetch<AnalyticsSummary>("/api/analytics", {
      query: { days: selectedDays.value },
    });
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || error?.data?.message || t("settings.analytics.loadFailed");
  } finally {
    loading.value = false;
  }
}

watch(selectedDays, () => {
  void fetchSummary();
});

onMounted(fetchSummary);
</script>

<template>
  <div class="min-w-0 space-y-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="planner-kicker">{{ t("settings.tabs.analytics") }}</p>
        <h3 class="mt-2 text-xl font-semibold text-[var(--text-1)]">{{ t("settings.analytics.title") }}</h3>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <div class="planner-segmented" role="group" :aria-label="t('settings.analytics.period')">
          <button
            v-for="days in dayOptions"
            :key="days"
            type="button"
            :class="selectedDays === days ? '!bg-[var(--surface-muted)] !text-[var(--text-1)]' : ''"
            :aria-pressed="selectedDays === days"
            @click="selectedDays = days"
          >
            {{ t("settings.analytics.days", { count: days }) }}
          </button>
        </div>

        <PrimeButton
          icon="pi pi-refresh"
          text
          rounded
          class="!h-9 !w-9 border !border-[var(--border-soft)]"
          :aria-label="t('settings.analytics.refresh')"
          :title="t('settings.analytics.refresh')"
          :loading="loading"
          @click="fetchSummary"
        />
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-10">
      <PrimeProgressSpinner />
    </div>

    <div v-else-if="errorMessage" class="planner-empty">
      <i class="pi pi-exclamation-triangle text-2xl text-[var(--danger-ink)]" aria-hidden="true"></i>
      <div>
        <strong class="block text-[var(--text-1)]">{{ t("settings.analytics.unavailable") }}</strong>
        <span class="text-sm">{{ errorMessage }}</span>
      </div>
    </div>

    <template v-else-if="summary">
      <VisitAnalyticsStats :summary="summary" />

      <VisitAnalyticsDailyChart :daily="summary.daily" />

      <div class="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
        <VisitAnalyticsRanking
          :kicker="t('settings.analytics.pages.kicker')"
          :title="t('settings.analytics.pages.title')"
          :items="pageItems"
          empty-icon="pi-chart-bar"
          :empty-text="t('settings.analytics.pages.empty')"
        />

        <VisitAnalyticsRanking
          :kicker="t('settings.analytics.locations.kicker')"
          :title="t('settings.analytics.locations.title')"
          :items="summary.hasLocationData ? locationItems : []"
          empty-icon="pi-map-marker"
          :empty-text="t('settings.analytics.locations.empty')"
        />
      </div>
    </template>
  </div>
</template>
