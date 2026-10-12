<script setup lang="ts">
import type { ShiftDayChange, ShiftWithStaff } from "~/types/shiftplan";
import type { Absence } from "~/types/absence";
import { formatWeekdays } from "~/utils/shift-coverage";

const props = defineProps<{
  shift: ShiftWithStaff;
  canEdit: boolean;
  absences?: Absence[];
  dayChanges?: ShiftDayChange[];
  myStaffId?: number | null;
  year?: number;
  week?: number;
}>();

const shiftChanges = computed(() => (props.dayChanges ?? []).filter((change) => change.shift_id === props.shift.shift_id));

// Absences of a person in this shift, or without a shift (planner entries).
function absencesOf(staffId: number): Absence[] {
  return (props.absences ?? []).filter(
    (absence) => absence.staff_id === staffId && (absence.shift_id === null || absence.shift_id === props.shift.shift_id)
  );
}

/** Weekdays on which an assigned person is taken out of this shift, unless they are absent anyway. */
function removedDays(staffId: number): string {
  const absent = new Set(absencesOf(staffId).map((absence) => absence.absence_date));
  return formatWeekdays(
    shiftChanges.value
      .filter((change) => change.kind === "remove" && change.staff_id === staffId && !absent.has(change.change_date))
      .map((change) => change.change_date)
  );
}

/** People who only join this shift on single days, with those days and their absences on them. */
const dayGuests = computed(() => {
  const assigned = new Set(props.shift.assigned_staff.map((staff) => staff.staff_id));
  const guests = new Map<number, { staffId: number; name: string; dates: string[] }>();
  for (const change of shiftChanges.value) {
    if (change.kind !== "add" || assigned.has(change.staff_id)) continue;
    const guest = guests.get(change.staff_id) ?? { staffId: change.staff_id, name: change.staff_name, dates: [] };
    guest.dates.push(change.change_date);
    guests.set(change.staff_id, guest);
  }
  return [...guests.values()].map((guest) => ({
    ...guest,
    days: formatWeekdays(guest.dates),
    absences: absencesOf(guest.staffId).filter((absence) => guest.dates.includes(absence.absence_date)),
  }));
});

const emit = defineEmits<{
  (e: "drag-start", event: DragEvent, staffId: number, staffName: string): void;
  (e: "drag-end"): void;
  (e: "unassign", staffId: number): void;
  (e: "add"): void;
  (e: "edit-days"): void;
}>();
</script>

<template>
  <div class="flex flex-wrap items-center justify-start gap-1.5 sm:justify-end">
    <span
      v-for="staff in shift.assigned_staff"
      :key="staff.staff_id"
      class="planner-assignee inline-flex h-8 items-center gap-1 rounded-lg pl-2.5 text-[0.8125rem]"
      :class="[
        canEdit ? 'cursor-grab pr-1 active:cursor-grabbing hover:border-[var(--border-strong)]' : 'pr-2.5',
        { 'is-me': staff.staff_id === myStaffId },
      ]"
      :draggable="canEdit"
      @dragstart="emit('drag-start', $event, staff.staff_id, staff.name)"
      @dragend="emit('drag-end')"
    >
      <span class="planner-assignee__name max-w-[11rem] truncate font-medium sm:max-w-[14rem]">
        {{ staff.name }}
      </span>
      <ShiftAbsenceChip :absences="absencesOf(staff.staff_id)" />
      <span
        v-if="removedDays(staff.staff_id)"
        class="rounded bg-[var(--surface-muted)] px-1 py-px text-[0.6875rem] font-semibold text-[var(--text-2)]"
        :title="`An diesen Tagen nicht in ${props.shift.name}`"
      >
        nicht {{ removedDays(staff.staff_id) }}
      </span>
      <button
        v-if="canEdit"
        type="button"
        class="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-3)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger-ink)]"
        :aria-label="`${staff.name} aus ${props.shift.name} entfernen`"
        @click.stop="emit('unassign', staff.staff_id)"
      >
        <i class="pi pi-times text-[0.625rem]" aria-hidden="true"></i>
      </button>
    </span>

    <span
      v-for="guest in dayGuests"
      :key="`guest-${guest.staffId}`"
      class="planner-assignee inline-flex h-8 items-center gap-1 rounded-lg border-dashed px-2.5 text-[0.8125rem]"
      :class="{ 'is-me': guest.staffId === myStaffId }"
      :title="`Nur an einzelnen Tagen in ${props.shift.name}`"
    >
      <span class="planner-assignee__name max-w-[11rem] truncate font-medium sm:max-w-[14rem]">{{ guest.name }}</span>
      <span class="rounded bg-[var(--positive-soft)] px-1 py-px text-[0.6875rem] font-semibold text-[var(--positive-ink)]">
        nur {{ guest.days }}
      </span>
      <ShiftAbsenceChip :absences="guest.absences" />
    </span>

    <button
      v-if="canEdit"
      type="button"
      class="planner-pill-button"
      :aria-label="`Mitarbeiter zu ${props.shift.name} hinzufügen`"
      @click="emit('add')"
    >
      <i class="pi pi-plus text-[0.7rem]" aria-hidden="true"></i>
      <span>Hinzufügen</span>
    </button>

    <button
      v-if="canEdit && year && week"
      type="button"
      class="planner-pill-button"
      :aria-label="`Einzelne Tage in ${props.shift.name} ändern`"
      @click="emit('edit-days')"
    >
      <i class="pi pi-calendar text-[0.7rem]" aria-hidden="true"></i>
      <span>Tage</span>
    </button>
  </div>
</template>
