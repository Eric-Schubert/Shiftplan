<script setup lang="ts">
import type {
  AnalyticsDailyMetric,
  AnalyticsLocationMetric,
  AnalyticsSummary,
} from "~/types/analytics";

const summary = ref<AnalyticsSummary | null>(null);
const loading = ref(true);
const errorMessage = ref("");
const selectedDays = ref(30);
const dayOptions = [7, 30, 90];

const maxDailyPageViews = computed(() =>
  Math.max(1, ...(summary.value?.daily.map((day) => day.pageViews) || [1]))
);

const latestDaily = computed(() => summary.value?.daily.slice(-14) || []);

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

function formatNumber(value: number): string {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(value || 0);
}

function formatAverage(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatLongDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function formatPath(path: string): string {
  if (path === "/") return "Schichtplan";
  return path;
}

function barStyle(day: AnalyticsDailyMetric): Record<string, string> {
  if (day.pageViews <= 0) return { height: "0.35rem" };
  const percent = Math.max(12, Math.round((day.pageViews / maxDailyPageViews.value) * 100));
  return { height: `${percent}%` };
}

function countryName(countryCode: string | null): string | null {
  if (!countryCode) return null;

  try {
    return new Intl.DisplayNames(["de"], { type: "region" }).of(countryCode) || countryCode;
  } catch {
    return countryCode;
  }
}

function formatLocation(location: AnalyticsLocationMetric): string {
  const parts = [
    location.city,
    location.region,
    countryName(location.countryCode) || location.countryCode,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "Unbekannt";
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
        <div class="inline-flex rounded-full border border-[var(--border-soft)] bg-[var(--surface-muted)] p-1">
          <button
            v-for="days in dayOptions"
            :key="days"
            type="button"
            class="min-h-9 rounded-full px-3 text-sm font-semibold text-[var(--text-2)] transition hover:text-[var(--text-1)]"
            :class="selectedDays === days ? 'bg-[var(--surface)] text-[var(--text-1)] shadow-sm' : ''"
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
          class="!h-10 !w-10 border !border-[var(--border-soft)]"
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

      <section class="planner-panel !p-0 min-w-0 max-w-full overflow-hidden">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-soft)] px-4 py-3">
          <div>
            <p class="planner-kicker">Tagesverlauf</p>
            <h4 class="mt-1 text-base font-semibold text-[var(--text-1)]">
              Letzte {{ latestDaily.length }} Tage
            </h4>
          </div>
          <span class="planner-chip planner-chip--muted">
            {{ formatNumber(maxDailyPageViews) }} max.
          </span>
        </div>

        <div class="max-w-full overflow-x-auto px-4 pb-4 pt-5">
          <div class="flex h-56 min-w-[34rem] items-end gap-2 sm:min-w-[42rem]">
            <div
              v-for="day in latestDaily"
              :key="day.date"
              class="flex h-full flex-1 flex-col justify-end gap-2"
              :title="`${formatLongDate(day.date)}: ${day.pageViews} Aufrufe, ${day.uniqueVisitors} individuell`"
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
                  {{ formatNumber(day.pageViews) }}
                </span>
                <span class="block text-[0.68rem] font-semibold text-[var(--text-3)]">
                  {{ formatDate(day.date) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
        <section class="planner-panel min-w-0">
          <div class="planner-section-heading">
            <div>
              <p class="planner-kicker">Seiten</p>
              <h4 class="mt-1 text-base font-semibold text-[var(--text-1)]">Meist aufgerufen</h4>
            </div>
          </div>

          <div v-if="summary.topPages.length > 0" class="space-y-2">
            <div
              v-for="page in summary.topPages"
              :key="page.path"
              class="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2.5"
            >
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-[var(--text-1)]">
                  {{ formatPath(page.path) }}
                </p>
                <p class="text-xs text-[var(--text-3)]">
                  {{ formatNumber(page.uniqueVisitors) }} individuelle Zugriffe
                </p>
              </div>
              <span class="planner-chip planner-chip--muted flex-shrink-0">
                {{ formatNumber(page.pageViews) }}
              </span>
            </div>
          </div>

          <div v-else class="planner-empty !py-8">
            <i class="pi pi-chart-bar text-2xl" aria-hidden="true"></i>
            <span>Noch keine Besuche erfasst</span>
          </div>
        </section>

        <section class="planner-panel min-w-0">
          <div class="planner-section-heading">
            <div>
              <p class="planner-kicker">Herkunft</p>
              <h4 class="mt-1 text-base font-semibold text-[var(--text-1)]">Land und Standort</h4>
            </div>
          </div>

          <div v-if="summary.hasLocationData" class="space-y-2">
            <div
              v-for="location in summary.locations"
              :key="`${location.countryCode}-${location.region}-${location.city}`"
              class="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2.5"
            >
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-[var(--text-1)]">
                  {{ formatLocation(location) }}
                </p>
                <p class="text-xs text-[var(--text-3)]">
                  {{ formatNumber(location.uniqueVisitors) }} individuelle Zugriffe
                </p>
              </div>
              <span class="planner-chip planner-chip--muted flex-shrink-0">
                {{ formatNumber(location.pageViews) }}
              </span>
            </div>
          </div>

          <div v-else class="planner-empty !py-8">
            <i class="pi pi-map-marker text-2xl" aria-hidden="true"></i>
            <span>Keine Standortdaten vorhanden</span>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>
