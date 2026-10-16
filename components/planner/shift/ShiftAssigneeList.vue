<script setup lang="ts">
import type { ShiftDayChange, ShiftWithStaff } from "~/types/shiftplan";
import { formatWeekdays } from "~/shared/utils/format/day";

const props = defineProps<{
  shift: ShiftWithStaff;
  canEdit: boolean;
  dayChanges?: ShiftDayChange[];
  myStaffId?: number | null;
  year?: number;
  week?: number;
}>();

const localeTag = useLocaleTag();
const { t } = useI18n();
const shiftChanges = computed(() => (props.dayChanges ?? []).filter((change) => change.shift_id === props.shift.shift_id));

/** Weekdays on which an assigned person is taken out of this shift. */
function removedDays(staffId: number): string {
  return formatWeekdays(
    localeTag.value,
    shiftChanges.value.filter((change) => change.kind === "remove" && change.staff_id === staffId).map((change) => change.change_date)
  );
}

/** People who only join this shift on single days, with those days. */
const dayGuests = computed(() => {
  const assigned = new Set(props.shift.assigned_staff.map((staff) => staff.staff_id));
  const guests = new Map<number, { staffId: number; name: string; dates: string[] }>();
  for (const change of shiftChanges.value) {
    if (change.kind !== "add" || assigned.has(change.staff_id)) continue;
    const guest = guests.get(change.staff_id) ?? { staffId: change.staff_id, name: change.staff_name, dates: [] };
    guest.dates.push(change.change_date);
    guests.set(change.staff_id, guest);
  }
  return [...guests.values()].map((guest) => ({ ...guest, days: formatWeekdays(localeTag.value, guest.dates) }));
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
      <span
        v-if="removedDays(staff.staff_id)"
        class="rounded bg-[var(--surface-muted)] px-1 py-px text-[0.6875rem] font-semibold text-[var(--text-2)]"
        :title="t('planner.shift.assignees.notOnDaysHint', { shift: props.shift.name })"
      >
        {{ t("planner.shift.assignees.notOn", { days: removedDays(staff.staff_id) }) }}
      </span>
      <button
        v-if="canEdit"
        type="button"
        class="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-3)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger-ink)]"
        :aria-label="t('planner.shift.assignees.remove', { name: staff.name, shift: props.shift.name })"
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
      :title="t('planner.shift.assignees.guestHint', { shift: props.shift.name })"
    >
      <span class="planner-assignee__name max-w-[11rem] truncate font-medium sm:max-w-[14rem]">{{ guest.name }}</span>
      <span class="rounded bg-[var(--positive-soft)] px-1 py-px text-[0.6875rem] font-semibold text-[var(--positive-ink)]">
        {{ t("planner.shift.assignees.onlyOn", { days: guest.days }) }}
      </span>
    </span>

    <button
      v-if="canEdit"
      type="button"
      class="planner-pill-button"
      :aria-label="t('planner.shift.assignees.addHint', { shift: props.shift.name })"
      @click="emit('add')"
    >
      <i class="pi pi-plus text-[0.7rem]" aria-hidden="true"></i>
      <span>{{ t("planner.shift.assignees.add") }}</span>
    </button>

    <button
      v-if="canEdit && year && week"
      type="button"
      class="planner-pill-button"
      :aria-label="t('planner.shift.assignees.editDaysHint', { shift: props.shift.name })"
      @click="emit('edit-days')"
    >
      <i class="pi pi-calendar text-[0.7rem]" aria-hidden="true"></i>
      <span>{{ t("planner.shift.assignees.days") }}</span>
    </button>
  </div>
</template>
