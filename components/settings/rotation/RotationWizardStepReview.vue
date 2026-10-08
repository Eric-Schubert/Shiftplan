<script setup lang="ts">
import type { RotationExcelImportResult } from "~/types/rotation";

defineProps<{
  importDone: RotationExcelImportResult | null;
}>();

const emit = defineEmits<{
  (e: "edit-board"): void;
}>();

const { patternWeeks, currentPatternWeek, understaffedCount, assignmentsLabel } = useRotationPatternSummary();

function staffingNote(staffCount: number, minStaff: number): string | null {
  if (staffCount === 0) return "unbesetzt";
  if (staffCount < minStaff) return `${staffCount} von ${minStaff}`;
  return null;
}
</script>

<template>
  <section class="space-y-4">
    <p
      v-if="importDone"
      class="rounded-xl bg-[var(--positive-soft)] px-4 py-3 text-sm text-[var(--positive-ink)]"
    >
      <i class="pi pi-check-circle mr-1" aria-hidden="true"></i>
      Muster übernommen: {{ assignmentsLabel(importDone.importedAssignments) }}.
    </p>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p
        class="text-sm"
        :class="understaffedCount > 0 ? 'text-[var(--warning-ink)]' : 'text-[var(--positive-ink)]'"
      >
        <template v-if="understaffedCount > 0">
          <i class="pi pi-exclamation-triangle mr-1" aria-hidden="true"></i>
          {{ understaffedCount }} {{ understaffedCount === 1 ? "Schicht ist" : "Schichten sind" }}
          im Muster unter der Mindestbesetzung.
        </template>
        <template v-else>
          <i class="pi pi-check-circle mr-1" aria-hidden="true"></i>
          Alle Schichten sind im Muster besetzt.
        </template>
      </p>
      <PrimeButton
        label="Im Board bearbeiten"
        icon="pi pi-pencil"
        severity="secondary"
        class="min-h-11 shrink-0"
        @click="emit('edit-board')"
      />
    </div>

    <div class="grid max-h-[50vh] gap-3 overflow-y-auto sm:grid-cols-2">
      <div
        v-for="week in patternWeeks"
        :key="week.pattern_week"
        class="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3"
      >
        <p class="flex items-center gap-2 text-sm font-semibold text-[var(--text-1)]">
          Musterwoche {{ week.pattern_week }}
          <span v-if="week.pattern_week === currentPatternWeek" class="planner-chip planner-chip--accent">
            diese Woche
          </span>
        </p>
        <ul class="mt-2 space-y-1.5 text-sm">
          <li v-for="assignment in week.assignments" :key="assignment.shift.shift_id" class="flex gap-2">
            <span
              class="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              :style="{ backgroundColor: assignment.shift.color }"
              aria-hidden="true"
            ></span>
            <span class="w-20 shrink-0 font-medium text-[var(--text-1)]">{{ assignment.shift.name }}</span>
            <span class="min-w-0 text-[var(--text-2)]">
              {{ assignment.staff.map((staff) => staff.name).join(", ") }}
              <span
                v-if="staffingNote(assignment.staff.length, assignment.shift.min_staff)"
                class="font-medium text-[var(--warning-ink)]"
              >
                {{ assignment.staff.length > 0 ? "·" : "" }}
                {{ staffingNote(assignment.staff.length, assignment.shift.min_staff) }}
              </span>
            </span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
