<script setup lang="ts">
import type { ChangelogEntry } from "~/utils/changelog";
import { extractVersion, isCurrentRelease, releaseUrl } from "~/utils/changelog/release-format";

defineProps<{
  entry: ChangelogEntry;
  currentVersion: string;
}>();

const releaseTitle = useReleaseTitle();
const { t } = useI18n();
</script>

<template>
  <div class="changelog-detail">
    <section class="changelog-detail__hero">
      <div class="changelog-detail__copy">
        <p class="changelog-dialog__eyebrow">
          {{ t("changelog.publishedOn", { date: entry.date }) }}
        </p>
        <a
          v-if="extractVersion(entry.title)"
          :href="releaseUrl(entry) || undefined"
          target="_blank"
          rel="noopener noreferrer"
          class="changelog-detail__release-link"
        >
          {{ releaseTitle(entry) }}
        </a>
        <h3
          v-else
          class="changelog-detail__release-title"
        >
          {{ entry.title }}
        </h3>
        <p class="changelog-detail__summary">
          {{ t("changelog.changeCount", { count: entry.changes.length }) }}
        </p>
      </div>

      <div class="changelog-detail__actions">
        <span
          v-if="isCurrentRelease(entry, currentVersion)"
          class="changelog-badge changelog-badge--accent"
        >
          {{ t("changelog.currentInstalled") }}
        </span>
        <a
          v-if="releaseUrl(entry)"
          :href="releaseUrl(entry) || undefined"
          target="_blank"
          rel="noopener noreferrer"
          class="changelog-link-button"
        >
          <i class="pi pi-share-alt text-base" aria-hidden="true"></i>
          {{ t("changelog.onGithub") }}
        </a>
      </div>
    </section>

    <section class="changelog-detail__panel">
      <div class="changelog-detail__panel-header">
        <div>
          <p class="changelog-dialog__eyebrow">
            {{ t("changelog.overview") }}
          </p>
          <h4 class="changelog-detail__panel-title">
            {{ t("changelog.whatsNew") }}
          </h4>
        </div>
        <span class="changelog-badge">
          {{ t("changelog.points", { count: entry.changes.length }) }}
        </span>
      </div>

      <ul class="changelog-detail__list">
        <li
          v-for="change in entry.changes"
          :key="change"
          class="changelog-change"
        >
          <i class="pi pi-check-circle changelog-change__icon" aria-hidden="true"></i>
          <span>{{ change }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>
