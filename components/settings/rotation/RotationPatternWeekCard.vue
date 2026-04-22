<script setup lang="ts">
import type {
  PatternWeekData,
  RotationAssignContext,
  RotationDropPayload,
  RotationStaffDragPayload,
} from "~/types/rotation";

const props = defineProps<{
  weekData: PatternWeekData;
  activeDropTarget: string | null;
}>();

const emit = defineEmits<{
  (e: "drag-over", payload: RotationDropPayload): void;
  (e: "drag-leave", payload: RotationDropPayload): void;
  (e: "drop-staff", payload: RotationDropPayload): void;
  (e: "open-assign", payload: RotationAssignContext): void;
  (e: "staff-drag-start", payload: RotationStaffDragPayload): void;
  (e: "unassign-staff", patternWeek: number, staffId: number, shiftId: number): void;
}>();

function isDragTarget(shiftId: number) {
  return props.activeDropTarget === `${props.weekData.pattern_week}-${shiftId}`;
}

function handleDragOver(event: DragEvent, shiftId: number) {
  emit("drag-over", {
    event,
    patternWeek: props.weekData.pattern_week,
    shiftId,
  });
}

function handleDragLeave(event: DragEvent, shiftId: number) {
  emit("drag-leave", {
    event,
    patternWeek: props.weekData.pattern_week,
    shiftId,
  });
}

function handleDrop(event: DragEvent, shiftId: number) {
  emit("drop-staff", {
    event,
    patternWeek: props.weekData.pattern_week,
    shiftId,
  });
}

function handleChipDragStart(
  event: DragEvent,
  shiftId: number,
  staffId: number,
  staffName: string
) {
  emit("staff-drag-start", {
    event,
    patternWeek: props.weekData.pattern_week,
    shiftId,
    staffId,
    staffName,
  });
}

function handleOpenAssign(shiftId: number, shiftName: string) {
  emit("open-assign", {
    patternWeek: props.weekData.pattern_week,
    shiftId,
    shiftName,
  });
}
</script>

<template>
  <div class="overflow-hidden rounded-lg border bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
    <div class="border-b bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-700/50">
      <h3 class="font-semibold text-gray-900 dark:text-white">
        Musterwoche {{ weekData.pattern_week }}
      </h3>
    </div>

    <div class="divide-y dark:divide-gray-700">
      <div
        v-for="assignment in weekData.assignments"
        :key="assignment.shift.shift_id"
        class="flex flex-col gap-3 px-4 py-3 transition-colors duration-150 sm:flex-row sm:items-center"
        :class="{
          'bg-blue-50/70 dark:bg-blue-900/20': isDragTarget(assignment.shift.shift_id),
        }"
        @dragover="handleDragOver($event, assignment.shift.shift_id)"
        @dragleave="handleDragLeave($event, assignment.shift.shift_id)"
        @drop="handleDrop($event, assignment.shift.shift_id)"
      >
        <div class="flex min-w-[150px] items-center gap-2">
          <div
            class="h-3 w-3 rounded-full"
            :style="{ backgroundColor: assignment.shift.color }"
          />
          <span class="font-medium text-gray-700 dark:text-gray-300">
            {{ assignment.shift.name }}
          </span>
          <span class="text-sm text-gray-500">
            ({{ assignment.shift.start_time }} - {{ assignment.shift.end_time }})
          </span>
        </div>

        <div class="flex flex-1 flex-wrap items-center gap-2">
          <span
            v-for="staff in assignment.staff"
            :key="staff.staff_id"
            class="inline-flex cursor-grab select-none items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-sm text-gray-700 transition-shadow hover:shadow-md active:cursor-grabbing dark:bg-gray-700 dark:text-gray-300"
            draggable="true"
            @dragstart="handleChipDragStart($event, assignment.shift.shift_id, staff.staff_id, staff.name)"
          >
            {{ staff.name }}
            <button
              type="button"
              class="ml-0.5 text-xs text-gray-400 hover:text-red-500"
              :aria-label="`${staff.name} aus Musterwoche ${weekData.pattern_week} und Schicht ${assignment.shift.name} entfernen`"
              @click="emit('unassign-staff', weekData.pattern_week, staff.staff_id, assignment.shift.shift_id)"
            >
              &times;
            </button>
          </span>

          <span
            v-if="isDragTarget(assignment.shift.shift_id) && assignment.staff.length === 0"
            class="text-xs italic text-blue-500 dark:text-blue-400"
          >
            Hier ablegen
          </span>

          <PrimeButton
            icon="pi pi-plus"
            text
            rounded
            class="!h-11 !w-11"
            :aria-label="`Mitarbeiter zu ${assignment.shift.name} in Musterwoche ${weekData.pattern_week} hinzufügen`"
            @click="handleOpenAssign(assignment.shift.shift_id, assignment.shift.name)"
            v-tooltip="'Mitarbeiter hinzufügen'"
          />
        </div>

        <div
          v-if="assignment.staff.length < assignment.shift.min_staff"
          class="flex items-center gap-1 text-yellow-600 dark:text-yellow-400"
        >
          <Icon name="mdi:alert" class="text-lg" />
          <span class="text-sm">{{ assignment.shift.min_staff - assignment.staff.length }} fehlt</span>
        </div>
      </div>
    </div>
  </div>
</template>
