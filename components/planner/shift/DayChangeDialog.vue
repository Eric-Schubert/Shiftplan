<script setup lang="ts">
import type { ShiftDayChange, ShiftWithStaff } from "~/types/shiftplan";
import { formatAbsenceDay } from "~/types/absence";

// Planner grid: who works this shift on which day of the week, on top of the weekly plan.
const props = defineProps<{
  visible: boolean;
  shift: ShiftWithStaff;
  year: number;
  week: number;
  dayChanges: ShiftDayChange[];
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "updated"): void;
}>();

const dataStore = useDataStore();
const { authFetch } = useAuthFetch();

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

const days = computed(() => weekDates(props.year, props.week));
const assigned = computed(() => new Set(props.shift.assigned_staff.map((staff) => staff.staff_id)));
const extraRows = ref<Array<{ staff_id: number; name: string }>>([]);
const addStaffId = ref<number | null>(null);
const busyCell = ref("");
const error = ref("");

const rows = computed(() => {
  const list = props.shift.assigned_staff.map((staff) => ({ staff_id: staff.staff_id, name: staff.name }));
  const seen = new Set(list.map((row) => row.staff_id));
  for (const change of props.dayChanges) {
    if (seen.has(change.staff_id)) continue;
    seen.add(change.staff_id);
    list.push({ staff_id: change.staff_id, name: change.staff_name });
  }
  for (const row of extraRows.value) {
    if (!seen.has(row.staff_id)) list.push(row);
  }
  return list;
});

const addOptions = computed(() => {
  const inGrid = new Set(rows.value.map((row) => row.staff_id));
  return dataStore.activeStaff
    .filter((staff) => !inGrid.has(staff.staff_id))
    .map((staff) => ({ label: staff.name, value: staff.staff_id }));
});

function change(staffId: number, date: string): ShiftDayChange | undefined {
  return props.dayChanges.find((entry) => entry.staff_id === staffId && entry.change_date === date);
}

function isPresent(staffId: number, date: string): boolean {
  const entry = change(staffId, date);
  return entry ? entry.kind === "add" : assigned.value.has(staffId);
}

async function toggle(staffId: number, date: string) {
  busyCell.value = `${staffId}-${date}`;
  error.value = "";
  try {
    await authFetch("/api/shiftplan/day-change", {
      method: "POST",
      body: { staff_id: staffId, shift_id: props.shift.shift_id, date, present: !isPresent(staffId, date) },
    });
    emit("updated");
  } catch (cause: any) {
    error.value = cause?.data?.statusMessage || "Änderung konnte nicht gespeichert werden";
  } finally {
    busyCell.value = "";
  }
}

watch(addStaffId, (staffId) => {
  if (!staffId) return;
  const staff = dataStore.activeStaff.find((entry) => entry.staff_id === staffId);
  if (staff) extraRows.value.push({ staff_id: staff.staff_id, name: staff.name });
  addStaffId.value = null;
});
</script>

<template>
  <PrimeDialog
    v-model:visible="dialogVisible"
    :header="`${shift.name} · KW ${week}`"
    modal
    :style="{ width: '40rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <div class="space-y-3 text-sm">
      <p class="text-[var(--text-2)]">
        Tippe auf einen Tag, um jemanden nur an diesem Tag ein- oder auszutragen. Der Wochenplan bleibt die Grundlage.
      </p>

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
                  @click="toggle(row.staff_id, date)"
                >
                  <i v-if="busyCell === `${row.staff_id}-${date}`" class="pi pi-spinner pi-spin text-[0.7rem]" aria-hidden="true"></i>
                  <i v-else-if="isPresent(row.staff_id, date)" class="pi pi-check text-[0.7rem]" aria-hidden="true"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <PrimeSelect
          v-model="addStaffId"
          :options="addOptions"
          option-label="label"
          option-value="value"
          placeholder="Weitere Person für einzelne Tage"
          filter
          class="min-w-[14rem] flex-1"
        />
      </div>
      <p class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-3)]">
        <span><span class="legend is-present"></span> eingeteilt</span>
        <span><span class="legend is-present is-changed"></span> nur an diesem Tag</span>
        <span><span class="legend is-changed"></span> an diesem Tag ausgetragen</span>
      </p>
      <small v-if="error" class="block text-sm text-[var(--danger-ink)]" role="alert">{{ error }}</small>
    </div>

    <template #footer>
      <PrimeButton label="Fertig" @click="dialogVisible = false" />
    </template>
  </PrimeDialog>
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
