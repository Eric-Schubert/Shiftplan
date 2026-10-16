<script setup lang="ts">
import type { ShiftDayChange, ShiftWithStaff } from "~/types/shiftplan";
import { cellKey, pruneSaved } from "~/utils/day-change-cells";
import { weekLabel } from "~/shared/utils/format/week";
import { datesOfISOWeek } from "~/shared/utils/week";

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
const localeTag = useLocaleTag();
const { t } = useI18n();
const requestError = useRequestError();

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

const days = computed(() => datesOfISOWeek(props.year, props.week));
const extraRows = ref<Array<{ staff_id: number; name: string }>>([]);
const addStaffId = ref<number | null>(null);
const busyCell = ref("");
const error = ref("");
// What was saved stays visible until the refreshed day changes show it.
const saved = ref<Record<string, boolean>>({});
watch(
  () => props.dayChanges,
  (changes) => {
    const assigned = new Set(props.shift.assigned_staff.map((staff) => staff.staff_id));
    saved.value = pruneSaved(saved.value, assigned, changes);
  }
);

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
  return dataStore.activeStaff.filter((staff) => !inGrid.has(staff.staff_id)).map((staff) => ({ label: staff.name, value: staff.staff_id }));
});

async function toggle(staffId: number, date: string, present: boolean) {
  busyCell.value = cellKey(staffId, date);
  error.value = "";
  try {
    await authFetch("/api/shiftplan/day-change", {
      method: "POST",
      body: { staff_id: staffId, shift_id: props.shift.shift_id, date, present },
    });
    saved.value = { ...saved.value, [cellKey(staffId, date)]: present };
    emit("updated");
  } catch (cause) {
    error.value = requestError(cause, "planner.shift.dayChange.failed");
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
    :header="`${shift.name} · ${weekLabel(localeTag, week)}`"
    modal
    :style="{ width: '40rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <div class="space-y-3 text-sm">
      <p class="text-[var(--text-2)]">
        {{ t("planner.shift.dayChange.intro") }}
      </p>

      <DayChangeGrid :shift="shift" :days="days" :rows="rows" :day-changes="dayChanges" :busy-cell="busyCell" :saved="saved" @toggle="toggle">
        <div class="flex flex-wrap items-center gap-2">
          <PrimeSelect
            v-model="addStaffId"
            :options="addOptions"
            option-label="label"
            option-value="value"
            :placeholder="t('planner.shift.dayChange.addPerson')"
            filter
            class="min-w-[14rem] flex-1"
          />
        </div>
      </DayChangeGrid>
      <small v-if="error" class="block text-sm text-[var(--danger-ink)]" role="alert">{{ error }}</small>
    </div>

    <template #footer>
      <PrimeButton :label="t('common.actions.done')" @click="dialogVisible = false" />
    </template>
  </PrimeDialog>
</template>
