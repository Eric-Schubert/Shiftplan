<script setup lang="ts">
const showDialog = ref(false);
</script>

<template>
  <div>
    <PrimeButton
      :label="$t('settings.yearCopy.button')"
      icon="pi pi-copy"
      severity="secondary"
      class="min-h-11"
      @click="showDialog = true"
    />

    <YearCopyDialog
      :visible="showDialog"
      @update:visible="showDialog = $event"
    />
  </div>
</template>
