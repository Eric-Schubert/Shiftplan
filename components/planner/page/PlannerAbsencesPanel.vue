<script setup lang="ts">
import { ABSENCE_REASON_LABELS, formatAbsenceDay, formatAbsenceRange, type Absence } from "~/types/absence";

const props = defineProps<{
  absences: Absence[];
  canEdit: boolean;
  /** Signed-in staff member, who may withdraw their own absences. */
  myStaffId?: number | null;
  year: number;
  week: number;
}>();

const emit = defineEmits<{
  (e: "updated"): void;
}>();

const { authFetch } = useAuthFetch();
const showDialog = ref(false);
const removing = ref<number | null>(null);
const error = ref("");

// Days entered as one range show up as a single row.
const sorted = computed(() => {
  const seen = new Set<string>();
  return [...props.absences]
    .sort((a, b) => a.absence_date.localeCompare(b.absence_date) || a.staff_name.localeCompare(b.staff_name, "de"))
    .filter((absence) => {
      if (!absence.batch_id) return true;
      if (seen.has(absence.batch_id)) return false;
      seen.add(absence.batch_id);
      return true;
    });
});

function canRemove(absence: Absence): boolean {
  return props.canEdit || (props.myStaffId != null && absence.staff_id === props.myStaffId);
}

function isRange(absence: Absence): boolean {
  return absence.range_from !== absence.range_to;
}

async function remove(absence: Absence) {
  removing.value = absence.absence_id;
  error.value = "";
  try {
    const query = isRange(absence) ? "?range=1" : "";
    if (props.canEdit) {
      await authFetch(`/api/absences/${absence.absence_id}${query}`, { method: "DELETE" });
    } else {
      await $fetch(`/api/member/absences/${absence.absence_id}${query}`, { method: "DELETE" });
    }
    emit("updated");
  } catch (cause: any) {
    error.value = cause?.data?.statusMessage || "Ausfall konnte nicht gelöscht werden";
  } finally {
    removing.value = null;
  }
}
</script>

<template>
  <div v-if="absences.length > 0 || canEdit" class="mt-4">
    <div class="planner-section-heading !mb-2">
      <h3 class="text-sm font-semibold text-[var(--text-1)]">Ausfälle diese Woche</h3>
      <PrimeButton
        v-if="canEdit"
        label="Ausfall eintragen"
        icon="pi pi-plus"
        size="small"
        severity="secondary"
        outlined
        class="min-h-8"
        @click="showDialog = true"
      />
    </div>

    <p v-if="sorted.length === 0" class="text-sm text-[var(--text-3)]">Keine Ausfälle gemeldet.</p>

    <ul v-else class="divide-y divide-[var(--border-soft)] rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]">
      <li v-for="absence in sorted" :key="absence.absence_id" class="flex items-center gap-3 px-4 py-2.5 text-sm">
        <span
          class="flex-shrink-0 font-semibold tabular-nums text-[var(--text-1)]"
          :class="isRange(absence) ? 'w-40' : 'w-20'"
        >
          {{ isRange(absence) ? formatAbsenceRange(absence) : formatAbsenceDay(absence.absence_date) }}
        </span>
        <span class="min-w-0 flex-1">
          <span class="font-medium text-[var(--text-1)]">{{ absence.staff_name }}</span>
          <span class="text-[var(--text-2)]"> fällt aus</span>
          <span v-if="absence.shift_name && !isRange(absence)" class="text-[var(--text-2)]"> · {{ absence.shift_name }} offen</span>
          <span v-if="absence.reason" class="ml-1 text-[var(--text-3)]">· {{ ABSENCE_REASON_LABELS[absence.reason] }}</span>
          <span v-if="absence.note" class="ml-1 italic text-[var(--text-3)]">· {{ absence.note }}</span>
        </span>
        <span v-if="absence.source === 'app'" class="planner-chip !py-0 text-[0.6875rem]">über App</span>
        <button
          v-if="canRemove(absence)"
          type="button"
          class="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-3)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger-ink)] disabled:opacity-50"
          :aria-label="isRange(absence) ? `Zeitraum von ${absence.staff_name} löschen` : `Ausfall von ${absence.staff_name} löschen`"
          :disabled="removing === absence.absence_id"
          @click="remove(absence)"
        >
          <i class="pi pi-times text-[0.7rem]" aria-hidden="true"></i>
        </button>
      </li>
    </ul>

    <small v-if="error" class="mt-2 block text-sm text-[var(--danger-ink)]" role="alert">{{ error }}</small>

    <LazyAbsenceDialog
      v-if="showDialog"
      :visible="showDialog"
      :year="year"
      :week="week"
      @update:visible="showDialog = $event"
      @created="emit('updated')"
    />
  </div>
</template>
