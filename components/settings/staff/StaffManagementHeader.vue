<script setup lang="ts">
defineProps<{
  count: number;
}>();

const emit = defineEmits<{
  (e: "create"): void;
}>();
</script>

<template>
  <div class="flex items-center justify-between">
    <p class="text-gray-600 dark:text-gray-400">{{ count }} Mitarbeiter</p>
    <PrimeButton
      label="Neuer Mitarbeiter"
      icon="pi pi-plus"
      class="min-h-11"
      @click="emit('create')"
    />
  </div>
</template>
