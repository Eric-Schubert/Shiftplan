<script setup lang="ts">
import type { RotationAssignContext } from "~/types/rotation";

interface RotationDropPayload {
  event: DragEvent;
  patternWeek: number;
  shiftId: number;
}

interface RotationStaffDragPayload {
  event: DragEvent;
  patternWeek: number;
  shiftId: number;
  staffId: number;
  staffName: string;
}

const dataStore = useDataStore();

const dragOverTarget = ref<string | null>(null);
const showAssignDialog = ref(false);
const assignContext = ref<RotationAssignContext | null>(null);
const assigning = ref(false);

const availableStaffForAssign = computed(() => {
  if (!assignContext.value || !dataStore.rotationPattern) return [];

  const weekData = dataStore.rotationPattern.weeks.find(
    (week) => week.pattern_week === assignContext.value?.patternWeek
  );

  if (!weekData) return dataStore.activeStaff;

  const shiftAssignment = weekData.assignments.find(
    (assignment) => assignment.shift.shift_id === assignContext.value?.shiftId
  );

  if (!shiftAssignment) return dataStore.activeStaff;

  const assignedIds = shiftAssignment.staff.map((staff) => staff.staff_id);
  return dataStore.activeStaff.filter((staff) => !assignedIds.includes(staff.staff_id));
});

function openAssignDialog(context: RotationAssignContext) {
  assignContext.value = context;
  showAssignDialog.value = true;
}

async function assignStaff(staffId: number) {
  if (!assignContext.value) return;

  assigning.value = true;
  try {
    await dataStore.assignToRotation(
      assignContext.value.patternWeek,
      staffId,
      assignContext.value.shiftId
    );
    showAssignDialog.value = false;
  } finally {
    assigning.value = false;
  }
}

async function unassignStaff(patternWeek: number, staffId: number, shiftId: number) {
  await dataStore.unassignFromRotation(patternWeek, staffId, shiftId);
}

function onPoolDragStart(event: DragEvent, staff: { staff_id: number; name: string }) {
  if (!event.dataTransfer) return;

  event.dataTransfer.effectAllowed = "copy";
  event.dataTransfer.setData(
    "application/json",
    JSON.stringify({
      staffId: staff.staff_id,
      staffName: staff.name,
      source: "pool",
    })
  );
}

function onChipDragStart({
  event,
  patternWeek,
  shiftId,
  staffId,
  staffName,
}: RotationStaffDragPayload) {
  if (!event.dataTransfer) return;

  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData(
    "application/json",
    JSON.stringify({
      staffId,
      staffName,
      source: "rotation",
      sourceShiftId: shiftId,
      sourcePatternWeek: patternWeek,
    })
  );
}

function onDragOver({ event, patternWeek, shiftId }: RotationDropPayload) {
  event.preventDefault();
  dragOverTarget.value = `${patternWeek}-${shiftId}`;
}

function onDragLeave({ event, patternWeek, shiftId }: RotationDropPayload) {
  const relatedTarget = event.relatedTarget as HTMLElement | null;
  const currentTarget = event.currentTarget as HTMLElement | null;

  if (!currentTarget || !relatedTarget || currentTarget.contains(relatedTarget)) {
    return;
  }

  if (dragOverTarget.value === `${patternWeek}-${shiftId}`) {
    dragOverTarget.value = null;
  }
}

async function onDrop({ event, patternWeek, shiftId }: RotationDropPayload) {
  event.preventDefault();
  dragOverTarget.value = null;

  const raw = event.dataTransfer?.getData("application/json");
  if (!raw) return;

  try {
    const data = JSON.parse(raw);
    const staffId = data.staffId;

    if (
      data.source === "rotation" &&
      data.sourceShiftId !== shiftId &&
      data.sourcePatternWeek === patternWeek
    ) {
      await dataStore.unassignFromRotation(patternWeek, staffId, data.sourceShiftId);
    } else if (data.source === "rotation" && data.sourcePatternWeek !== patternWeek) {
      await dataStore.unassignFromRotation(data.sourcePatternWeek, staffId, data.sourceShiftId);
    }

    await dataStore.assignToRotation(patternWeek, staffId, shiftId);
  } catch (error) {
    console.error("Drop fehlgeschlagen:", error);
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div class="flex items-start gap-3">
        <Icon name="mdi:information" class="mt-0.5 text-xl text-primary-light dark:text-primary-dark" />
        <div class="text-sm text-gray-700 dark:text-gray-300">
          <p class="mb-1 font-medium">So funktioniert das Rotationsmuster:</p>
          <p class="mb-2">
            Lege fest, wer in welcher Woche des Zyklus welche Schicht arbeitet.
            Das Muster wiederholt sich alle <strong>{{ dataStore.rotationPattern?.config.cycle_length || 4 }} Wochen</strong>.
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            <Icon name="mdi:calendar" class="mr-1" />
            Musterwoche 1 beginnt in KW {{ dataStore.rotationPattern?.config.start_week }}/{{ dataStore.rotationPattern?.config.start_year }}
          </p>
        </div>
      </div>
    </div>

    <div class="rounded-lg border p-3 shadow-sm dark:border-gray-700 bg-white dark:bg-gray-800">
      <h4 class="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Mitarbeiter-Pool – per Drag & Drop in Schichten ziehen
      </h4>
      <div class="flex flex-wrap gap-1.5">
        <span
          v-for="staff in dataStore.activeStaff"
          :key="staff.staff_id"
          class="inline-flex cursor-grab select-none items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 transition-all hover:bg-blue-200 hover:shadow-md active:cursor-grabbing dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60"
          draggable="true"
          @dragstart="onPoolDragStart($event, staff)"
        >
          {{ staff.name }}
          <span v-if="staff.is_parttime" class="text-[10px] opacity-60">TZ</span>
        </span>
      </div>
    </div>

    <div v-if="dataStore.loadingRotation" class="flex justify-center py-8">
      <PrimeProgressSpinner />
    </div>

    <div v-else-if="dataStore.rotationPattern" class="space-y-4">
      <RotationPatternWeekCard
        v-for="weekData in dataStore.rotationPattern.weeks"
        :key="weekData.pattern_week"
        :week-data="weekData"
        :active-drop-target="dragOverTarget"
        @drag-over="onDragOver"
        @drag-leave="onDragLeave"
        @drop-staff="onDrop"
        @open-assign="openAssignDialog"
        @staff-drag-start="onChipDragStart"
        @unassign-staff="unassignStaff"
      />
    </div>

    <RotationAssignDialog
      :visible="showAssignDialog"
      :context="assignContext"
      :available-staff="availableStaffForAssign"
      :assigning="assigning"
      @update:visible="showAssignDialog = $event"
      @assign="assignStaff"
    />
  </div>
</template>
