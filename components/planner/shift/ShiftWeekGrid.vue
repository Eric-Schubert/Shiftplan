<script setup lang="ts">
import type { ShiftDayChange, ShiftWithStaff } from "~/types/shiftplan";
import { formatDay } from "~/shared/utils/format/day";
import type { Absence } from "~/types/absence";
import { shortNames, weekGridRow, type GridCell, type GridPerson } from "~/utils/week-grid";

// Week at a glance: who actually works each shift on each work day.
const props = defineProps<{
  shifts: ShiftWithStaff[];
  workdays: string[];
  /** Date → short holiday name. */
  holidays: Map<string, string>;
  dayChanges: ShiftDayChange[];
  absences: Absence[];
  canEdit: boolean;
  myStaffId?: number | null;
}>();

const emit = defineEmits<{ (e: "edit-days", shiftId: number): void }>();
const localeTag = useLocaleTag();

const today = todayISO();

const rows = computed(() => {
  const holidayDates = new Set(props.holidays.keys());
  return props.shifts.map((shift) => ({
    shift,
    cells: weekGridRow(shift, props.workdays, props.dayChanges, props.absences, holidayDates, localeTag.value),
  }));
});

const short = computed(() => shortNames(rows.value.flatMap((row) => row.cells.flatMap((cell) => cell.people.map((person) => person.name)))));

const CELL_CLASSES: Record<GridCell["status"], string> = {
  ok: "",
  short: "bg-[var(--warning-soft)]",
  open: "bg-[var(--danger-soft)]",
  holiday: "bg-[var(--positive-soft)]",
};

function personClass(person: GridPerson): string {
  if (person.staffId === props.myStaffId) return "bg-[var(--accent)] text-white";
  return person.guest ? "bg-[var(--info-soft)] text-[var(--info-ink)]" : "bg-[var(--surface-muted)] text-[var(--text-1)]";
}

function dayLabel(date: string): string {
  return formatDay(localeTag.value, date, "date");
}
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]">
    <table class="w-full table-fixed border-separate border-spacing-0">
      <colgroup>
        <col class="w-[5.25rem] sm:w-40" />
        <col v-for="date in workdays" :key="date" />
      </colgroup>
      <thead>
        <tr>
          <th scope="col"><span class="sr-only">Schicht</span></th>
          <th
            v-for="date in workdays"
            :key="date"
            scope="col"
            class="px-0.5 py-2 text-center text-xs font-semibold"
            :class="[date === today ? 'text-[var(--accent)]' : 'text-[var(--text-2)]', { 'bg-[var(--positive-soft)]': holidays.has(date) }]"
          >
            {{ formatDay(localeTag, date, "weekday") }}
            <span class="block font-normal tabular-nums">{{ dayLabel(date) }}</span>
            <span v-if="holidays.has(date)" class="block truncate font-normal text-[var(--positive-ink)]" :title="holidays.get(date)">
              {{ holidays.get(date) }}
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.shift.shift_id">
          <th scope="row" class="border-t border-[var(--border-soft)] px-2 py-2 text-left font-normal">
            <component
              :is="canEdit ? 'button' : 'div'"
              :type="canEdit ? 'button' : undefined"
              class="flex w-full items-center gap-2 text-left"
              :class="{ 'rounded-md hover:bg-[var(--surface-hover)]': canEdit }"
              :title="canEdit ? `Tage in ${row.shift.name} ändern` : undefined"
              @click="canEdit && emit('edit-days', row.shift.shift_id)"
            >
              <span class="h-7 w-1 shrink-0 rounded-full" :style="{ background: row.shift.color }" aria-hidden="true"></span>
              <span class="min-w-0">
                <span class="block break-words text-xs font-semibold leading-tight text-[var(--text-1)] sm:text-sm">{{ row.shift.name }}</span>
                <span class="hidden text-xs tabular-nums text-[var(--text-2)] sm:block">{{ row.shift.start_time }}–{{ row.shift.end_time }}</span>
              </span>
            </component>
          </th>
          <td
            v-for="cell in row.cells"
            :key="cell.date"
            class="border-t border-[var(--border-soft)] px-0.5 py-1.5 text-center align-middle"
            :class="CELL_CLASSES[cell.status]"
          >
            <span v-if="cell.status === 'open'" class="text-xs font-semibold text-[var(--danger-ink)]">offen</span>
            <div v-else class="flex flex-col items-center gap-1">
              <span
                v-for="person in cell.people"
                :key="person.staffId"
                class="max-w-full break-words rounded px-1 py-0.5 text-[0.6875rem] font-medium leading-tight sm:text-xs"
                :class="personClass(person)"
                :title="person.guest ? `${person.name} (Vertretung)` : person.name"
              >
                <span class="sm:hidden">{{ short.get(person.name) }}</span>
                <span class="hidden sm:inline">{{ person.name }}</span>
              </span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <ShiftWeekGridLegend />
</template>
