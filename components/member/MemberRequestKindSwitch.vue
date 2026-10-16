<script setup lang="ts">
type RequestKind = "takeover" | "swap";

// Segmented switch between giving one shift away and swapping all shifts for a period.
const kind = defineModel<RequestKind>({ required: true });

const { t } = useI18n();
const kindOptions = computed<Array<{ label: string; value: RequestKind }>>(() => [
  { label: t("requests.dialog.takeover"), value: "takeover" },
  { label: t("requests.dialog.swap"), value: "swap" },
]);
</script>

<template>
  <div class="grid grid-cols-2 gap-1 rounded-lg bg-[var(--surface-muted)] p-1" role="radiogroup" :aria-label="t('requests.dialog.kind')">
    <button
      v-for="option in kindOptions"
      :key="option.value"
      type="button"
      role="radio"
      :aria-checked="kind === option.value"
      class="min-h-9 rounded-md px-3 font-medium transition-colors"
      :class="kind === option.value ? 'bg-[var(--surface)] text-[var(--text-1)] shadow-sm' : 'text-[var(--text-2)] hover:text-[var(--text-1)]'"
      @click="kind = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>
