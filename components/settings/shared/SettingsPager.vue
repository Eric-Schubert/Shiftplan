<script setup lang="ts">
// Previous/next buttons of a paged settings list; the default slot holds the page label.
defineProps<{ page: number; totalPages: number }>();
const emit = defineEmits<{ (e: "prev"): void; (e: "next"): void }>();
</script>

<template>
  <div class="mt-4 flex items-center justify-between gap-3 border-t pt-4">
    <PrimeButton
      icon="pi pi-chevron-left"
      text
      class="!h-11 !w-11"
      aria-label="Vorherige Seite"
      :disabled="page === 0"
      @click="emit('prev')"
    />
    <slot />
    <PrimeButton
      icon="pi pi-chevron-right"
      text
      class="!h-11 !w-11"
      aria-label="Nächste Seite"
      :disabled="page >= totalPages - 1"
      @click="emit('next')"
    />
  </div>
</template>
