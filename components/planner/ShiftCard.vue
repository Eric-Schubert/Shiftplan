<script setup lang="ts">
import type { ShiftDayChange, ShiftWithStaff } from "~/types/shiftplan";
import { useShiftCardInteractions } from "~/composables/useShiftCardInteractions";
import { formatWeekdays } from "~/shared/utils/format/day";
import { understaffedDates } from "~/utils/shift-coverage";

const props = defineProps<{
  shift: ShiftWithStaff;
  year: number;
  week: number;
  dayChanges?: ShiftDayChange[];
  /** Work days without holidays. */
  coverageDates: string[];
  myStaffId?: number | null;
}>();

const emit = defineEmits<{ updated: []; "edit-days": [shiftId: number] }>();

const authStore = useAuthStore();
const localeTag = useLocaleTag();
const { t } = useI18n();

const shift = toRef(props, "shift");
const year = toRef(props, "year");
const week = toRef(props, "week");

const {
  showAssignDialog,
  assigning,
  availableStaff,
  isDropTarget,
  isHovering,
  shiftCardStyle,
  assignStaff,
  unassignStaff,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
} = useShiftCardInteractions({
  shift,
  year,
  week,
  onUpdated: () => emit("updated"),
});

// Gaps in the plan itself; absences show up in the week grid. All days short reads as plain „Unterbesetzt“.
const understaffedNote = computed(() => {
  const short = understaffedDates(props.shift, props.coverageDates, props.dayChanges ?? [], []);
  if (short.length === 0) return "";
  return short.length === props.coverageDates.length
    ? t("planner.shift.understaffed")
    : t("planner.shift.understaffedOn", { days: formatWeekdays(localeTag.value, short) });
});
</script>

<template>
  <div
    class="planner-shift-card group flex items-stretch gap-3 sm:gap-4"
    :class="{
      'is-drop-hover': isHovering,
      'is-drop-target': isDropTarget && !isHovering,
    }"
    :style="shiftCardStyle"
    @dragover="onDragOver"
    @dragenter="onDragEnter"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <span class="planner-shift-rail" aria-hidden="true"></span>

    <div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2.5">
      <div class="min-w-0 flex-1 basis-40">
        <div class="flex flex-wrap items-center gap-2">
          <p class="truncate text-[0.9375rem] font-semibold text-[var(--text-1)]">{{ shift.name }}</p>
          <span
            v-if="understaffedNote"
            class="rounded-md bg-[var(--warning-soft)] px-1.5 py-0.5 text-[0.6875rem] font-semibold text-[var(--warning-ink)]"
          >
            {{ understaffedNote }}
          </span>
        </div>
        <div class="planner-time-badge mt-0.5">
          <i class="pi pi-clock text-[0.7rem]" aria-hidden="true"></i>
          <span>{{ shift.start_time }}–{{ shift.end_time }}</span>
        </div>
      </div>

      <ShiftAssigneeList
        :shift="shift"
        :day-changes="dayChanges"
        :my-staff-id="myStaffId"
        :year="year"
        :week="week"
        :can-edit="authStore.canEditShifts"
        @drag-start="onDragStart"
        @drag-end="onDragEnd"
        @unassign="unassignStaff"
        @add="showAssignDialog = true"
        @edit-days="emit('edit-days', shift.shift_id)"
      />
    </div>

    <ShiftAssignDialog
      :visible="showAssignDialog"
      :shift-name="shift.name"
      :available-staff="availableStaff"
      :assigning="assigning"
      @update:visible="showAssignDialog = $event"
      @assign="assignStaff"
    />
  </div>
</template>
