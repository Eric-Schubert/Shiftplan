<script setup lang="ts">
import type { ShiftDayChange, ShiftWithStaff } from "~/types/shiftplan";
import { formatAbsenceDay } from "~/types/absence";

// Staff × weekday grid of one shift and its legend; the default slot renders between them.
const props = defineProps<{
  shift: ShiftWithStaff;
  days: string[];
  rows: Array<{ staff_id: number; name: string }>;
  dayChanges: ShiftDayChange[];
  busyCell: string;
}>();
const emit = defineEmits<{ (e: "toggle", staffId: number, date: string, present: boolean): void }>();

const assigned = computed(() => new Set(props.shift.assigned_staff.map((staff) => staff.staff_id)));

function change(staffId: number, date: string): ShiftDayChange | undefined {
  return props.dayChanges.find((entry) => entry.staff_id === staffId && entry.change_date === date);
}

function isPresent(staffId: number, date: string): boolean {
  const entry = change(staffId, date);
  return entry ? entry.kind === "add" : assigned.value.has(staffId);
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full min-w-[30rem] border-separate border-spacing-1">
      <thead>
        <tr>
          <th class="text-left font-medium text-[var(--text-3)]"></th>
          <th v-for="date in days" :key="date" class="w-12 text-center text-xs font-medium text-[var(--text-3)]">
            {{ formatAbsenceDay(date, false) }}<br />
            <span class="tabular-nums">{{ date.slice(8, 10) }}.{{ date.slice(5, 7) }}.</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.staff_id">
          <th class="max-w-[10rem] truncate pr-2 text-left font-medium text-[var(--text-1)]" scope="row">
            {{ row.name }}
            <span v-if="!assigned.has(row.staff_id)" class="block text-xs font-normal text-[var(--text-3)]">nicht im Wochenplan</span>
          </th>
          <td v-for="date in days" :key="date" class="text-center">
            <button
              type="button"
              class="day-cell"
              :class="{
                'is-present': isPresent(row.staff_id, date),
                'is-changed': change(row.staff_id, date),
              }"
              :disabled="busyCell !== ''"
              :aria-pressed="isPresent(row.staff_id, date)"
              :aria-label="`${row.name} am ${formatAbsenceDay(date)} ${isPresent(row.staff_id, date) ? 'austragen' : 'eintragen'}`"
              @click="emit('toggle', row.staff_id, date, !isPresent(row.staff_id, date))"
            >
              <i v-if="busyCell === `${row.staff_id}-${date}`" class="pi pi-spinner pi-spin text-[0.7rem]" aria-hidden="true"></i>
              <i v-else-if="isPresent(row.staff_id, date)" class="pi pi-check text-[0.7rem]" aria-hidden="true"></i>
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <slot />

  <p class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-3)]">
    <span><span class="legend is-present"></span> eingeteilt</span>
    <span><span class="legend is-present is-changed"></span> nur an diesem Tag</span>
    <span><span class="legend is-changed"></span> an diesem Tag ausgetragen</span>
  </p>
</template>

<style scoped>
.day-cell,
.legend {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-soft);
  border-radius: 0.5rem;
  background: var(--surface);
  color: var(--text-2);
}

.day-cell {
  width: 2.5rem;
  height: 2.25rem;
  transition: background-color 0.15s;
}

.day-cell:hover:not(:disabled) {
  border-color: var(--border-strong);
}

.legend {
  width: 0.875rem;
  height: 0.875rem;
  vertical-align: -2px;
}

.is-present {
  background: var(--surface-muted);
  color: var(--text-1);
}

.is-changed {
  border: 1px dashed var(--accent);
}

.is-present.is-changed {
  background: var(--accent-soft);
  color: var(--accent-strong);
}
</style>
