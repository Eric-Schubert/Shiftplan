<script setup lang="ts">
import { formatRelativeChangelogDate, type ChangelogEntry } from "~/utils/changelog";
import { formatReleaseTitle, isCurrentRelease } from "~/utils/changelog/release-format";

const props = defineProps<{
  entries: ChangelogEntry[];
  currentVersion: string;
}>();

const emit = defineEmits<{
  (e: "open", entry: ChangelogEntry): void;
}>();

function isLatest(entry: ChangelogEntry): boolean {
  return props.entries[0] === entry;
}

function previewChanges(entry: ChangelogEntry): string[] {
  return entry.changes.slice(0, 2);
}

function remainingChangeCount(entry: ChangelogEntry): number {
  return Math.max(0, entry.changes.length - previewChanges(entry).length);
}
</script>

<template>
  <div class="changelog-shell">
    <button
      v-for="entry in entries"
      :key="`${entry.date}:${entry.title}`"
      type="button"
      class="changelog-release"
      @click="emit('open', entry)"
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
              v-if="isCurrentRelease(entry, currentVersion)"
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
</template>
