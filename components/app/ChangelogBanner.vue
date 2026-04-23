<script setup lang="ts">
import {
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
const hasBuildMetadata = computed(() => /\+\d+$/.test(currentVersion));

const dialogWidth = computed(() => (showReleaseList.value ? "880px" : "720px"));
const displayCurrentVersion = computed(() => formatVersion(currentVersion));
const dialogEyebrow = computed(() => {
  if (showReleaseList.value) return "Versionsarchiv";
  return mode.value === "update" ? "Neu in dieser Version" : "Aenderungsprotokoll";
});
const dialogTitle = computed(() => {
  if (showReleaseList.value) return "Versionsverlauf";
  if (detailEntry.value) return formatReleaseTitle(detailEntry.value);
  return mode.value === "update" ? "Was sich geaendert hat" : "Versionsverlauf";
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

function normalizeVersion(value: string): string | null {
  const version = extractVersion(value);
  return version ? version.replace(/\+.*$/, "") : null;
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
  return normalizeVersion(entry.title) === normalizeVersion(displayCurrentVersion.value);
}

function releaseUrl(entry: ChangelogEntry): string | null {
  const version = normalizeVersion(entry.title);
  return version ? `https://github.com/Eric-Schubert/Shiftplanv2/releases/tag/${version}` : null;
}

function previewChanges(entry: ChangelogEntry): string[] {
  return entry.changes.slice(0, 2);
}

function remainingChangeCount(entry: ChangelogEntry): number {
  return Math.max(0, entry.changes.length - previewChanges(entry).length);
}

function openEntry(entry: ChangelogEntry) {
  selectedEntry.value = entry;
}
</script>

<template>
  <PrimeDialog
    v-model:visible="isVisible"
    modal
    class="changelog-dialog"
    :closable="true"
    :draggable="false"
    :style="{ width: dialogWidth, maxWidth: '96vw' }"
    @hide="dismiss"
  >
    <template #header>
      <div class="changelog-dialog__header">
        <div class="changelog-dialog__icon">
          <i
            :class="[showReleaseList ? 'pi pi-history' : 'pi pi-info-circle', 'text-xl']"
            aria-hidden="true"
          ></i>
        </div>

        <div class="min-w-0 flex-1">
          <p class="changelog-dialog__eyebrow">
            {{ dialogEyebrow }}
          </p>
          <h2 class="changelog-dialog__title">
            {{ dialogTitle }}
          </h2>
          <div class="changelog-dialog__meta">
            <span class="changelog-badge changelog-badge--accent">
              Installiert {{ displayCurrentVersion }}
            </span>
            <span
              v-if="hasBuildMetadata"
              class="changelog-badge"
            >
              Entwicklungsstand
            </span>
          </div>
        </div>
      </div>
    </template>

    <div
      v-if="showReleaseList"
      class="changelog-shell"
    >
      <button
        v-for="entry in visibleEntries"
        :key="`${entry.date}:${entry.title}`"
        type="button"
        class="changelog-release"
        @click="openEntry(entry)"
      >
        <div class="changelog-release__meta">
          <span class="changelog-release__relative">
            {{ formatRelativeChangelogDate(entry.date) }}
          </span>
          <span class="changelog-release__date">
            {{ entry.date }}
          </span>
        </div>

        <div class="changelog-release__body">
          <div class="changelog-release__header">
            <h3 class="changelog-release__title">
              {{ formatReleaseTitle(entry) }}
            </h3>
            <div class="changelog-release__badges">
              <span
                v-if="isLatest(entry)"
                class="changelog-badge changelog-badge--success"
              >
                Neueste Version
              </span>
              <span
                v-if="isCurrent(entry)"
                class="changelog-badge changelog-badge--accent"
              >
                Aktuell
              </span>
            </div>
          </div>

          <ul
            v-if="entry.changes.length"
            class="changelog-release__preview"
          >
            <li
              v-for="change in previewChanges(entry)"
              :key="change"
              class="changelog-release__preview-item"
            >
              <i class="pi pi-check-circle changelog-release__preview-icon" aria-hidden="true"></i>
              <span>{{ change }}</span>
            </li>
            <li
              v-if="remainingChangeCount(entry)"
              class="changelog-release__preview-more"
            >
              +{{ remainingChangeCount(entry) }} weitere Punkte
            </li>
          </ul>
        </div>

        <span class="changelog-release__cta">
          <span>Ansehen</span>
          <i class="pi pi-arrow-right text-base" aria-hidden="true"></i>
        </span>
      </button>
    </div>

    <div
      v-else-if="detailEntry"
      class="changelog-detail"
    >
      <section class="changelog-detail__hero">
        <div class="changelog-detail__copy">
          <p class="changelog-dialog__eyebrow">
            Veroeffentlicht am {{ detailEntry.date }}
          </p>
          <a
            v-if="extractVersion(detailEntry.title)"
            :href="releaseUrl(detailEntry) || undefined"
            target="_blank"
            rel="noopener noreferrer"
            class="changelog-detail__release-link"
          >
            {{ formatReleaseTitle(detailEntry) }}
          </a>
          <h3
            v-else
            class="changelog-detail__release-title"
          >
            {{ detailEntry.title }}
          </h3>
          <p class="changelog-detail__summary">
            {{ detailEntry.changes.length }} Aenderungen in diesem Stand.
          </p>
        </div>

        <div class="changelog-detail__actions">
          <span
            v-if="isCurrent(detailEntry)"
            class="changelog-badge changelog-badge--accent"
          >
            Aktuell installiert
          </span>
          <a
            v-if="releaseUrl(detailEntry)"
            :href="releaseUrl(detailEntry) || undefined"
            target="_blank"
            rel="noopener noreferrer"
            class="changelog-link-button"
          >
            <i class="pi pi-share-alt text-base" aria-hidden="true"></i>
            Release auf GitHub
          </a>
        </div>
      </section>

      <section class="changelog-detail__panel">
        <div class="changelog-detail__panel-header">
          <div>
            <p class="changelog-dialog__eyebrow">
              Ueberblick
            </p>
            <h4 class="changelog-detail__panel-title">
              Was neu ist
            </h4>
          </div>
          <span class="changelog-badge">
            {{ detailEntry.changes.length }} Punkte
          </span>
        </div>

        <ul class="changelog-detail__list">
          <li
            v-for="change in detailEntry.changes"
            :key="change"
            class="changelog-change"
          >
            <i class="pi pi-check-circle changelog-change__icon" aria-hidden="true"></i>
            <span>{{ change }}</span>
          </li>
        </ul>
      </section>
    </div>

    <div
      v-else
      class="changelog-empty"
    >
      <i class="pi pi-info-circle text-xl" aria-hidden="true"></i>
      <div>
        <strong>Noch kein Aenderungsprotokoll vorhanden.</strong>
        <p class="m-0 mt-1">
          Sobald fuer diese Version ein Release erzeugt wurde, taucht er hier auf.
        </p>
      </div>
    </div>

    <template #footer>
      <div class="changelog-footer">
        <PrimeButton
          v-if="selectedEntry"
          label="Zurueck"
          icon="pi pi-arrow-left"
          severity="secondary"
          outlined
          @click="selectedEntry = null"
        />
        <PrimeButton
          label="Schliessen"
          severity="secondary"
          outlined
          @click="dismiss"
        />
      </div>
    </template>
  </PrimeDialog>
</template>
