<script setup lang="ts">
const showDialog = ref(false);
</script>

<template>
  <div>
    <PrimeButton
      label="Jahr kopieren"
      icon="pi pi-copy"
      severity="secondary"
      size="small"
      @click="showDialog = true"
    />

    <YearCopyDialog
      :visible="showDialog"
      @update:visible="showDialog = $event"
    />
  </div>
</template>
