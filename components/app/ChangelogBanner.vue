<script setup lang="ts">
import type { ChangelogEntry } from "~/utils/changelog";
import { formatReleaseTitle, formatVersion } from "~/utils/changelog/release-format";

const { isVisible, entries, currentVersion, dismiss } = useChangelog();

const selectedEntry = ref<ChangelogEntry | null>(null);

const showReleaseList = computed(() => !selectedEntry.value);
const hasBuildMetadata = computed(() => /\+\d+$/.test(currentVersion));

const dialogWidth = computed(() => (showReleaseList.value ? "880px" : "720px"));
const displayCurrentVersion = computed(() => formatVersion(currentVersion));
const dialogEyebrow = computed(() => (showReleaseList.value ? "Versionsarchiv" : "Änderungsprotokoll"));
const dialogTitle = computed(() =>
  selectedEntry.value ? formatReleaseTitle(selectedEntry.value) : "Versionsverlauf"
);

watch(isVisible, (visible) => {
  if (!visible) selectedEntry.value = null;
});
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

    <ChangelogReleaseDetail
      v-if="selectedEntry"
      :entry="selectedEntry"
      :current-version="displayCurrentVersion"
    />

    <ChangelogReleaseList
      v-else
      :entries="entries"
      :current-version="displayCurrentVersion"
      @open="selectedEntry = $event"
    />

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
