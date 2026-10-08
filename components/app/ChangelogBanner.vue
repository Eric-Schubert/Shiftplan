<script setup lang="ts">
import type { ChangelogEntry } from "~/utils/changelog";
import { formatReleaseTitle, formatVersion } from "~/utils/changelog/release-format";

const { isVisible, entries, mode, currentVersion, check, dismiss } = useChangelog();

const selectedEntry = ref<ChangelogEntry | null>(null);

const isHistoryMode = computed(() => mode.value === "history");
const latestEntry = computed(() => entries.value[0] || null);
const detailEntry = computed(() => selectedEntry.value || (isHistoryMode.value ? null : latestEntry.value));
const showReleaseList = computed(() => isHistoryMode.value && !selectedEntry.value);
const hasBuildMetadata = computed(() => /\+\d+$/.test(currentVersion));

const dialogWidth = computed(() => (showReleaseList.value ? "880px" : "720px"));
const displayCurrentVersion = computed(() => formatVersion(currentVersion));
const dialogEyebrow = computed(() => {
  if (showReleaseList.value) return "Versionsarchiv";
  return mode.value === "update" ? "Neu in dieser Version" : "Änderungsprotokoll";
});
const dialogTitle = computed(() => {
  if (showReleaseList.value) return "Versionsverlauf";
  if (detailEntry.value) return formatReleaseTitle(detailEntry.value);
  return mode.value === "update" ? "Was sich geändert hat" : "Versionsverlauf";
});

watch(isVisible, (visible) => {
  if (!visible) selectedEntry.value = null;
});

watch(mode, () => {
  selectedEntry.value = null;
});

onMounted(() => check());
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
      <ChangelogDialogHeader
        :history="showReleaseList"
        :eyebrow="dialogEyebrow"
        :title="dialogTitle"
        :version="displayCurrentVersion"
        :has-build-metadata="hasBuildMetadata"
      />
    </template>

    <ChangelogReleaseList
      v-if="showReleaseList"
      :entries="entries"
      :current-version="displayCurrentVersion"
      @open="selectedEntry = $event"
    />

    <ChangelogReleaseDetail
      v-else-if="detailEntry"
      :entry="detailEntry"
      :current-version="displayCurrentVersion"
    />

    <div
      v-else
      class="changelog-empty"
    >
      <i class="pi pi-info-circle text-xl" aria-hidden="true"></i>
      <div>
        <strong>Noch kein Änderungsprotokoll vorhanden.</strong>
        <p class="m-0 mt-1">
          Sobald für diese Version ein Release erzeugt wurde, taucht er hier auf.
        </p>
      </div>
    </div>

    <template #footer>
      <div class="changelog-footer">
        <PrimeButton
          v-if="selectedEntry"
          label="Zurück"
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
