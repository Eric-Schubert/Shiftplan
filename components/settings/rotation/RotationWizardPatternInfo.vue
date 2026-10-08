<script setup lang="ts">
const props = defineProps<{ today: { year: number; week: number } }>();
const editing = defineModel<boolean>("editing", { required: true });

const { today, rotationConfig, assignmentCount, currentPatternWeek, assignmentsLabel } =
  useRotationPatternSummary(props.today);
</script>

<template>
  <div class="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4">
    <p class="planner-kicker">Aktuelles Muster</p>
    <div v-if="rotationConfig" class="mt-2 flex flex-wrap items-center gap-2">
      <span class="planner-chip planner-chip--accent">{{ rotationConfig.cycle_length }}-Wochen-Zyklus</span>
      <span class="planner-chip">
        Musterwoche 1 = KW {{ rotationConfig.start_week }}/{{ rotationConfig.start_year }}
      </span>
      <span class="planner-chip">{{ assignmentsLabel(assignmentCount) }}</span>
    </div>
    <p v-if="currentPatternWeek" class="mt-3 text-sm text-[var(--text-2)]">
      Diese Woche (KW {{ today.week }}/{{ today.year }}) ist Musterwoche {{ currentPatternWeek }}.
      <button
        v-if="!editing"
        type="button"
        class="ml-1 font-medium text-[var(--accent-strong)] underline-offset-2 hover:underline"
        @click="editing = true"
      >
        Startpunkt ändern
      </button>
    </p>

    <div v-if="editing" class="mt-4 border-t border-[var(--border-soft)] pt-4">
      <RotationConfigForm @saved="editing = false" @cancel="editing = false" />
    </div>
  </div>
</template>
