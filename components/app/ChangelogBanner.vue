<script setup lang="ts">
import type { ChangelogEntry } from "~/utils/changelog";
import { formatVersion } from "~/utils/changelog/release-format";

const { isVisible, entries, currentVersion, dismiss } = useChangelog();
const releaseTitle = useReleaseTitle();
const { t } = useI18n();

const selectedEntry = ref<ChangelogEntry | null>(null);

const showReleaseList = computed(() => !selectedEntry.value);
const hasBuildMetadata = computed(() => /\+\d+$/.test(currentVersion));

const dialogWidth = computed(() => (showReleaseList.value ? "880px" : "720px"));
const displayCurrentVersion = computed(() => formatVersion(currentVersion));
const dialogEyebrow = computed(() => (showReleaseList.value ? t("changelog.eyebrow.history") : t("changelog.eyebrow.detail")));
const dialogTitle = computed(() =>
  selectedEntry.value ? releaseTitle(selectedEntry.value) : t("changelog.title")
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
          :label="t('common.actions.back')"
          icon="pi pi-arrow-left"
          severity="secondary"
          outlined
          @click="selectedEntry = null"
        />
        <PrimeButton
          :label="t('changelog.close')"
          severity="secondary"
          outlined
          @click="dismiss"
        />
      </div>
    </template>
  </PrimeDialog>
</template>
