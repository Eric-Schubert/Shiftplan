<script setup lang="ts">
// Planner dialogs need staff, shifts and the rotation; without them they would look empty, so a failed load says so.
const authStore = useAuthStore();
const dataStore = useDataStore();
const { t } = useI18n();
const retrying = ref(false);

async function retry() {
  retrying.value = true;
  await dataStore.init();
  retrying.value = false;
}
</script>

<template>
  <AppRetryNotice
    v-if="authStore.canEditShifts && dataStore.loadError"
    class="mb-4"
    :message="t('app.layout.dataFailed')"
    :loading="retrying"
    @retry="retry"
  />
</template>
