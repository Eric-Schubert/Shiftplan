<script setup lang="ts">
import { ABSENCE_REASON_LABELS, formatAbsenceDay, type Absence } from "~/types/absence";
import { formatWeekdays } from "~/utils/shift-coverage";

const props = defineProps<{ absences: Absence[] }>();

const days = computed(() => formatWeekdays(props.absences.map((absence) => absence.absence_date)));

const title = computed(() =>
  props.absences
    .map((absence) => {
      const reason = absence.reason ? ` (${ABSENCE_REASON_LABELS[absence.reason]})` : "";
      return `Fällt ${formatAbsenceDay(absence.absence_date)} aus${reason}`;
    })
    .join("\n")
);
</script>

<template>
  <span
    v-if="absences.length > 0"
    class="rounded bg-[var(--warning-soft)] px-1 py-px text-[0.6875rem] font-semibold text-[var(--warning-ink)]"
    :title="title"
  >
    fällt aus {{ days }}
  </span>
</template>
