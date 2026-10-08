<script setup lang="ts">
import type { AnalyticsSummary } from "~/types/analytics";
import { formatLocation, formatPath } from "~/utils/analytics/format";

const summary = ref<AnalyticsSummary | null>(null);
const loading = ref(true);
const errorMessage = ref("");
const selectedDays = ref(30);
const dayOptions = [7, 30, 90];

const pageItems = computed(() =>
  (summary.value?.topPages ?? []).map((page) => ({ ...page, key: page.path, label: formatPath(page.path) }))
);
const locationItems = computed(() =>
  (summary.value?.locations ?? []).map((location) => ({
    ...location,
    key: `${location.countryCode}-${location.region}-${location.city}`,
    label: formatLocation(location),
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
    errorMessage.value =
      error?.data?.statusMessage || error?.data?.message || "Besuchsdaten konnten nicht geladen werden.";
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
        <p class="planner-kicker">Besuche</p>
        <h3 class="mt-2 text-xl font-semibold text-[var(--text-1)]">Seitenaufrufe</h3>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <div class="planner-segmented" role="group" aria-label="Zeitraum">
          <button
            v-for="days in dayOptions"
            :key="days"
            type="button"
            :class="selectedDays === days ? '!bg-[var(--surface-muted)] !text-[var(--text-1)]' : ''"
            :aria-pressed="selectedDays === days"
            @click="selectedDays = days"
          >
            {{ days }} Tage
          </button>
        </div>

        <PrimeButton
          icon="pi pi-refresh"
          text
          rounded
          class="!h-9 !w-9 border !border-[var(--border-soft)]"
          aria-label="Besuchsdaten aktualisieren"
          title="Besuchsdaten aktualisieren"
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
        <strong class="block text-[var(--text-1)]">Statistik nicht verfügbar</strong>
        <span class="text-sm">{{ errorMessage }}</span>
      </div>
    </div>

    <template v-else-if="summary">
      <VisitAnalyticsStats :summary="summary" />

      <VisitAnalyticsDailyChart :daily="summary.daily" />

      <div class="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
        <VisitAnalyticsRanking
          kicker="Seiten"
          title="Meist aufgerufen"
          :items="pageItems"
          empty-icon="pi-chart-bar"
          empty-text="Noch keine Besuche erfasst"
        />

        <VisitAnalyticsRanking
          kicker="Herkunft"
          title="Land und Standort"
          :items="summary.hasLocationData ? locationItems : []"
          empty-icon="pi-map-marker"
          empty-text="Keine Standortdaten vorhanden"
        />
      </div>
    </template>
  </div>
</template>
