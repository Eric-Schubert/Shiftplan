<script setup lang="ts">
import type { ShiftDayChange, ShiftWithStaff } from "~/types/shiftplan";
import type { Absence } from "~/types/absence";
import { useShiftCardInteractions } from "~/composables/useShiftCardInteractions";

const props = defineProps<{
  shift: ShiftWithStaff;
  year: number;
  week: number;
  absences?: Absence[];
  dayChanges?: ShiftDayChange[];
}>();

const emit = defineEmits<{ updated: [] }>();

const authStore = useAuthStore();

const shift = toRef(props, "shift");
const year = toRef(props, "year");
const week = toRef(props, "week");

const {
  showAssignDialog,
  assigning,
  availableStaff,
  isUnderstaffed,
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
            v-if="isUnderstaffed"
            class="rounded-md bg-[var(--warning-soft)] px-1.5 py-0.5 text-[0.6875rem] font-semibold text-[var(--warning-ink)]"
          >
            Unterbesetzt
          </span>
        </div>
        <div class="planner-time-badge mt-0.5">
          <i class="pi pi-clock text-[0.7rem]" aria-hidden="true"></i>
          <span>{{ shift.start_time }}–{{ shift.end_time }}</span>
        </div>
      </div>

      <ShiftAssigneeList
        :shift="shift"
        :absences="absences"
        :day-changes="dayChanges"
        :can-edit="authStore.canEditShifts"
        @drag-start="onDragStart"
        @drag-end="onDragEnd"
        @unassign="unassignStaff"
        @add="showAssignDialog = true"
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
