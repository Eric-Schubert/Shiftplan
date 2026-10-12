<script setup lang="ts">
type PlannerView = "week" | "plan";

// Segmented switch between the week grid and the editable shift cards.
const view = defineModel<PlannerView>({ required: true });

const viewOptions: Array<{ label: string; value: PlannerView }> = [
  { label: "Woche", value: "week" },
  { label: "Plan bearbeiten", value: "plan" },
];
</script>

<template>
  <div class="inline-flex gap-1 rounded-lg bg-[var(--surface-muted)] p-1 text-xs" role="radiogroup" aria-label="Ansicht">
    <button
      v-for="option in viewOptions"
      :key="option.value"
      type="button"
      role="radio"
      :aria-checked="view === option.value"
      class="min-h-7 rounded-md px-2.5 font-semibold transition-colors"
      :class="view === option.value ? 'bg-[var(--surface)] text-[var(--text-1)] shadow-sm' : 'text-[var(--text-2)] hover:text-[var(--text-1)]'"
      @click="view = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>
