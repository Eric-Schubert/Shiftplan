<script setup lang="ts">
import type { GenerationPreviewWeek } from "~/types/shiftplan";

const props = defineProps<{
  preview: GenerationPreviewWeek[];
  loading: boolean;
  startWeek: number;
  startYear: number;
  overwrite: boolean;
}>();

const lastPreviewWeek = computed(() => props.preview.at(-1));

function weekStatus(week: GenerationPreviewWeek): { label: string; tone: string } {
  if (week.existing_assignments === 0) {
    return { label: "Neu", tone: "bg-[var(--positive-soft)] text-[var(--positive-ink)]" };
  }
  if (props.overwrite) {
    return { label: "Wird überschrieben", tone: "bg-[var(--danger-soft)] text-[var(--danger-ink)]" };
  }
  return { label: "Bleibt wie geplant", tone: "bg-[var(--surface-muted)] text-[var(--text-2)]" };
}
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-[var(--border-soft)]">
    <div
      class="flex items-center justify-between bg-[var(--surface-muted)] px-4 py-2 text-sm font-medium text-[var(--text-1)]"
    >
      <span>
        Vorschau
        <template v-if="lastPreviewWeek">
          · KW {{ startWeek }}/{{ startYear }} bis KW {{ lastPreviewWeek.week }}/{{ lastPreviewWeek.year }}
        </template>
      </span>
      <i v-if="loading" class="pi pi-spinner pi-spin text-[var(--text-3)]" aria-hidden="true"></i>
    </div>
    <ul class="max-h-56 divide-y divide-[var(--border-soft)] overflow-y-auto text-sm">
      <li
        v-for="week in preview"
        :key="`${week.year}-${week.week}`"
        class="flex items-center justify-between gap-3 px-4 py-1.5"
      >
        <span class="text-[var(--text-1)]">
          KW {{ week.week }}/{{ week.year }}
          <span class="text-[var(--text-3)]">· Musterwoche {{ week.pattern_week }}</span>
        </span>
        <span class="rounded-md px-2 py-0.5 text-xs font-semibold" :class="weekStatus(week).tone">
          {{ weekStatus(week).label }}
        </span>
      </li>
    </ul>
  </div>
</template>
