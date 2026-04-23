<script setup lang="ts">
import type { ShiftWithStaff } from "~/types/shiftplan";
import { useShiftCardInteractions } from "~/composables/useShiftCardInteractions";

const props = defineProps<{
  shift: ShiftWithStaff;
  year: number;
  week: number;
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
      'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--app-bg)] bg-[var(--accent-soft)]': isHovering,
      'ring-1 ring-dashed ring-[var(--accent)]': isDropTarget && !isHovering,
    }"
    :style="shiftCardStyle"
    @dragover="onDragOver"
    @dragenter="onDragEnter"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <span class="planner-shift-rail" aria-hidden="true"></span>

    <div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-3 sm:gap-x-4">
      <div class="min-w-0 flex-1">
        <div class="space-y-2 sm:space-y-3">
          <div class="flex flex-wrap items-center gap-2">
            <span class="hidden rounded-full bg-[var(--surface-muted)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-3)] sm:inline-flex">
              Schicht
            </span>
            <span
              v-if="isUnderstaffed"
              class="rounded-full bg-[var(--warning-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--warning-ink)]"
            >
              Unterbesetzt
            </span>
          </div>

          <div class="space-y-2">
            <p class="text-base font-semibold text-[var(--text-1)]">{{ shift.name }}</p>

            <div class="planner-time-badge">
              <i class="pi pi-clock text-sm" aria-hidden="true"></i>
              <span>{{ shift.start_time }} - {{ shift.end_time }}</span>
            </div>
          </div>
        </div>
      </div>

      <ShiftAssigneeList
        :shift="shift"
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
