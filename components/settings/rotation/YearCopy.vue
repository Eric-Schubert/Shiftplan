<script setup lang="ts">
const showDialog = ref(false);
</script>

<template>
  <div>
    <PrimeButton
      label="Jahr kopieren"
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
