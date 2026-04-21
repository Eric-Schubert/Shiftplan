<script setup lang="ts">
const emit = defineEmits<{
  (e: "create"): void;
}>();
</script>

<template>
  <div class="mb-4 flex items-center justify-between">
    <p class="text-sm text-gray-500 dark:text-gray-400">
      Verwalte Benutzer und deren Berechtigungen
    </p>

    <PrimeButton
      label="Neuer Benutzer"
      icon="pi pi-user-plus"
      class="min-h-11"
      @click="emit('create')"
    />
  </div>
</template>
