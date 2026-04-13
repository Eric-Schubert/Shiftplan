<script setup lang="ts">
/**
 * ChangelogBanner Component
 * 
 * Zeigt nach einem Update einmalig ein Modal mit den Neuerungen.
 * Version kommt aus package.json, Inhalt aus utils/changelog.ts.
 */
const { isVisible, latestEntry, currentVersion, check, dismiss } = useChangelog()

onMounted(() => check())
</script>

<template>
  <PrimeDialog
    v-model:visible="isVisible"
    modal
    :closable="true"
    :draggable="false"
    :style="{ width: '520px', maxWidth: '95vw' }"
    @hide="dismiss"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-primary-light/10 dark:bg-primary-dark/10 rounded-full flex items-center justify-center">
          <Icon name="mdi:party-popper" class="text-xl text-primary-light dark:text-primary-dark" />
        </div>
        <div>
          <h2 class="text-lg font-bold text-gray-900 dark:text-white m-0">
            Was ist neu?
          </h2>
          <span class="text-sm text-gray-500 dark:text-gray-400">
            Version {{ currentVersion }}
          </span>
        </div>
      </div>
    </template>

    <div v-if="latestEntry">
      <!-- Titel & Datum -->
      <div class="flex items-center gap-2 mb-3">
        <h3 class="font-semibold text-gray-800 dark:text-gray-200 m-0">
          {{ latestEntry.title }}
        </h3>
        <span class="text-xs text-gray-400 dark:text-gray-500">
          {{ latestEntry.date }}
        </span>
      </div>

      <!-- Änderungen -->
      <ul class="space-y-2 m-0 p-0 list-none">
        <li
          v-for="change in latestEntry.changes"
          :key="change"
          class="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300"
        >
          <Icon 
            name="mdi:check-circle" 
            class="text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" 
          />
          <span>{{ change }}</span>
        </li>
      </ul>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <PrimeButton
          label="Verstanden"
          icon="pi pi-check"
          @click="dismiss"
        />
      </div>
    </template>
  </PrimeDialog>
</template>
