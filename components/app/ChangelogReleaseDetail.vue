<script setup lang="ts">
import type { ChangelogEntry } from "~/utils/changelog";
import {
  extractVersion,
  formatReleaseTitle,
  isCurrentRelease,
  releaseUrl,
} from "~/utils/changelog/release-format";

defineProps<{
  entry: ChangelogEntry;
  currentVersion: string;
}>();
</script>

<template>
  <div class="changelog-detail">
    <section class="changelog-detail__hero">
      <div class="changelog-detail__copy">
        <p class="changelog-dialog__eyebrow">
          Veröffentlicht am {{ entry.date }}
        </p>
        <a
          v-if="extractVersion(entry.title)"
          :href="releaseUrl(entry) || undefined"
          target="_blank"
          rel="noopener noreferrer"
          class="changelog-detail__release-link"
        >
          {{ formatReleaseTitle(entry) }}
        </a>
        <h3
          v-else
          class="changelog-detail__release-title"
        >
          {{ entry.title }}
        </h3>
        <p class="changelog-detail__summary">
          {{ entry.changes.length }} Änderungen in diesem Stand.
        </p>
      </div>

      <div class="changelog-detail__actions">
        <span
          v-if="isCurrentRelease(entry, currentVersion)"
          class="changelog-badge changelog-badge--accent"
        >
          Aktuell installiert
        </span>
        <a
          v-if="releaseUrl(entry)"
          :href="releaseUrl(entry) || undefined"
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
            Überblick
          </p>
          <h4 class="changelog-detail__panel-title">
            Was neu ist
          </h4>
        </div>
        <span class="changelog-badge">
          {{ entry.changes.length }} Punkte
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
