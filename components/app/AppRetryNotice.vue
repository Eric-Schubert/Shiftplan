<script setup lang="ts">
// Something could not be loaded: says so instead of showing an empty list, and offers to try again.
defineProps<{ message: string; loading?: boolean }>();
const emit = defineEmits<{ (e: "retry"): void }>();
const { t } = useI18n();
</script>

<template>
  <div class="flex flex-wrap items-center gap-3 rounded-xl bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger-ink)]" role="alert">
    <span class="min-w-0 flex-1">{{ message }}</span>
    <PrimeButton :label="t('common.actions.retry')" icon="pi pi-refresh" size="small" class="min-h-9" :loading="loading" @click="emit('retry')" />
  </div>
</template>
