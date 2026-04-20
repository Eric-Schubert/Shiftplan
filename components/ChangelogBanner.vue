<script setup lang="ts">
import {
  formatChangelogDate,
  formatRelativeChangelogDate,
  type ChangelogEntry,
} from "~/utils/changelog";

const { isVisible, entries, mode, currentVersion, check, dismiss } = useChangelog();

const selectedEntry = ref<ChangelogEntry | null>(null);

const isHistoryMode = computed(() => mode.value === "history");
const visibleEntries = computed(() => entries.value);
const latestEntry = computed(() => visibleEntries.value[0] || null);
const detailEntry = computed(() => selectedEntry.value || (isHistoryMode.value ? null : latestEntry.value));
const showReleaseList = computed(() => isHistoryMode.value && !selectedEntry.value);

const dialogWidth = computed(() => (showReleaseList.value ? "820px" : "680px"));
const displayCurrentVersion = computed(() => formatVersion(currentVersion));
const dialogTitle = computed(() => {
  if (showReleaseList.value) return "Versionsverlauf";
  if (detailEntry.value) return `Änderungsprotokoll ${formatReleaseTitle(detailEntry.value)}`;
  return mode.value === "update" ? "Was ist neu?" : "Versionsverlauf";
});

watch(isVisible, (visible) => {
  if (!visible) selectedEntry.value = null;
});

watch(mode, () => {
  selectedEntry.value = null;
});

onMounted(() => check());

function extractVersion(value: string): string | null {
  const match = value.match(/v?\d+(?:\.\d+)+(?:[-+][A-Za-z0-9.-]+)?/);
  return match ? formatVersion(match[0]) : null;
}

function formatVersion(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "v0.0.0";
  return trimmed.startsWith("v") ? trimmed : `v${trimmed}`;
}

function formatReleaseTitle(entry: ChangelogEntry): string {
  const version = extractVersion(entry.title);
  return version ? `Release ${version}` : entry.title;
}

function isLatest(entry: ChangelogEntry): boolean {
  return latestEntry.value === entry;
}

function isCurrent(entry: ChangelogEntry): boolean {
  const version = extractVersion(entry.title);
  return version === displayCurrentVersion.value;
}

function releaseUrl(entry: ChangelogEntry): string | null {
  const version = extractVersion(entry.title);
  return version ? `https://github.com/Eric-Schubert/Shiftplanv2/releases/tag/${version}` : null;
}

function openEntry(entry: ChangelogEntry) {
  selectedEntry.value = entry;
}
</script>

<template>
  <PrimeDialog
    v-model:visible="isVisible"
    modal
    :closable="true"
    :draggable="false"
    :style="{ width: dialogWidth, maxWidth: '95vw' }"
    @hide="dismiss"
  >
    <template #header>
      <div class="flex items-start gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light/10 text-primary-light dark:bg-primary-dark/10 dark:text-primary-dark">
          <Icon
            :name="showReleaseList ? 'mdi:history' : 'mdi:file-document-outline'"
            class="text-xl"
          />
        </div>
        <div>
          <h2 class="m-0 text-xl font-bold text-gray-900 dark:text-white">
            {{ dialogTitle }}
          </h2>
          <p class="m-0 mt-1 text-sm text-gray-500 dark:text-gray-400">
            Aktuell installiert: {{ displayCurrentVersion }}
          </p>
        </div>
      </div>
    </template>

    <div v-if="showReleaseList" class="space-y-3">
      <button
        v-for="entry in visibleEntries"
        :key="`${entry.date}:${entry.title}`"
        type="button"
        class="flex w-full flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-left transition hover:border-primary-light/50 hover:bg-white dark:border-gray-700 dark:bg-gray-800/70 dark:hover:border-primary-dark/50 dark:hover:bg-gray-800 sm:flex-row sm:items-center sm:justify-between"
        @click="openEntry(entry)"
      >
        <span class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <span class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:w-24">
            <span>{{ formatRelativeChangelogDate(entry.date) }}</span>
            <span class="mt-0.5 block text-[11px] font-medium normal-case tracking-normal text-gray-400 dark:text-gray-500">
              {{ formatChangelogDate(entry.date) }}
            </span>
          </span>
          <span class="flex min-w-0 flex-wrap items-center gap-2">
            <span class="truncate text-lg font-bold text-gray-900 dark:text-white">
              {{ formatReleaseTitle(entry) }}
            </span>
            <span
              v-if="isLatest(entry)"
              class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-300"
            >
              neueste
            </span>
            <span
              v-if="isCurrent(entry)"
              class="rounded-full bg-primary-light/10 px-2 py-0.5 text-xs font-semibold text-primary-light dark:bg-primary-dark/20 dark:text-primary-dark"
            >
              Aktuell
            </span>
          </span>
        </span>

        <span class="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-light px-3 py-2 text-sm font-semibold text-white dark:bg-primary-dark dark:text-gray-950">
          <Icon name="mdi:file-document-outline" class="text-base" />
          Änderungsprotokoll anzeigen
        </span>
      </button>
    </div>

    <div v-else-if="detailEntry" class="space-y-5">
      <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/70">
        <a
          v-if="extractVersion(detailEntry.title)"
          :href="releaseUrl(detailEntry) || undefined"
          target="_blank"
          rel="noopener noreferrer"
          class="text-lg font-bold text-primary-light underline-offset-4 hover:underline dark:text-primary-dark"
        >
          {{ extractVersion(detailEntry.title) }}
        </a>
        <h3
          v-else
          class="m-0 text-lg font-bold text-gray-900 dark:text-white"
        >
          {{ detailEntry.title }}
        </h3>
        <p class="m-0 mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
          {{ formatChangelogDate(detailEntry.date) }}
        </p>
      </div>

      <div>
        <h4 class="mb-3 flex items-center gap-2 text-base font-bold text-gray-800 dark:text-gray-200">
          <Icon name="mdi:sparkles" class="text-primary-light dark:text-primary-dark" />
          Änderungen
        </h4>
        <ul class="m-0 space-y-2 p-0">
          <li
            v-for="change in detailEntry.changes"
            :key="change"
            class="flex items-start gap-3 rounded-lg bg-gray-50 px-3 py-2 text-sm leading-6 text-gray-700 dark:bg-gray-800/70 dark:text-gray-300"
          >
            <Icon
              name="mdi:check-circle"
              class="mt-0.5 flex-shrink-0 text-green-500 dark:text-green-400"
            />
            <span>{{ change }}</span>
          </li>
        </ul>
      </div>
    </div>

    <div v-else class="rounded-lg bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
      Für diese Version ist noch kein Änderungsprotokoll vorhanden.
    </div>

    <template #footer>
      <div class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <PrimeButton
          v-if="selectedEntry"
          label="Zurück"
          icon="pi pi-arrow-left"
          severity="secondary"
          outlined
          @click="selectedEntry = null"
        />
        <a
          v-if="detailEntry && releaseUrl(detailEntry)"
          :href="releaseUrl(detailEntry) || undefined"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-light px-4 py-2 text-sm font-semibold text-white hover:opacity-90 dark:bg-primary-dark dark:text-gray-950"
        >
          <Icon name="mdi:github" class="text-base" />
          Auf GitHub anzeigen
        </a>
        <PrimeButton
          label="Schließen"
          severity="secondary"
          outlined
          @click="dismiss"
        />
      </div>
    </template>
  </PrimeDialog>
</template>
