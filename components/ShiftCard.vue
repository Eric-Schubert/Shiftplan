<script setup lang="ts">
import type { ShiftWithStaff } from "~/types/shiftplan";
import { useDragDrop } from "~/composables/useDragDrop";

const props = defineProps<{
  shift: ShiftWithStaff;
  year: number;
  week: number;
}>();

const emit = defineEmits<{ updated: [] }>();

const authStore = useAuthStore();
const dataStore = useDataStore();
const { authFetch } = useAuthFetch();
const { state: dragState, startDrag, endDrag, setHoverShift, getPayload, isValidDrop } = useDragDrop();

const showAssignDialog = ref(false);
const assigning = ref(false);

// Verfügbare Mitarbeiter aus dem Store
const availableStaff = computed(() => {
  const assignedIds = props.shift.assigned_staff.map((s) => s.staff_id);
  return dataStore.activeStaff.filter((s) => !assignedIds.includes(s.staff_id));
});

async function assignStaff(staffId: number) {
  assigning.value = true;
  try {
    await authFetch("/api/shiftplan/assign", {
      method: "POST",
      body: { staff_id: staffId, shift_id: props.shift.shift_id, year: props.year, week: props.week },
    });
    emit("updated");
    showAssignDialog.value = false;
  } finally {
    assigning.value = false;
  }
}

async function unassignStaff(staffId: number) {
  await authFetch("/api/shiftplan/unassign", {
    method: "POST",
    body: { staff_id: staffId, shift_id: props.shift.shift_id, year: props.year, week: props.week },
  });
  emit("updated");
}

// Mindestbesetzung prüfen
const isUnderstaffed = computed(() => {
  return props.shift.assigned_staff.length < props.shift.min_staff;
});

// ============================================
// DRAG & DROP
// ============================================

/** Drag starten: Mitarbeiter-Chip wird gezogen */
function onDragStart(event: DragEvent, staffId: number, staffName: string) {
  startDrag(event, {
    staffId,
    staffName,
    sourceShiftId: props.shift.shift_id,
  });
}

function onDragEnd() {
  endDrag();
}

/** Drop-Zone: Visuelles Feedback */
function onDragOver(event: DragEvent) {
  if (isValidDrop(props.shift.shift_id)) {
    event.preventDefault();
    setHoverShift(props.shift.shift_id);
  }
}

function onDragEnter(event: DragEvent) {
  if (isValidDrop(props.shift.shift_id)) {
    event.preventDefault();
    setHoverShift(props.shift.shift_id);
  }
}

function onDragLeave(event: DragEvent) {
  const relatedTarget = event.relatedTarget as HTMLElement | null;
  const currentTarget = event.currentTarget as HTMLElement;
  if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
    if (dragState.hoverShiftId === props.shift.shift_id) {
      setHoverShift(null);
    }
  }
}

/** Drop ausführen: Mitarbeiter von Quell-Schicht entfernen und hier zuweisen */
async function onDrop(event: DragEvent) {
  event.preventDefault();
  setHoverShift(null);

  const payload = getPayload();
  if (!payload || payload.sourceShiftId === props.shift.shift_id) return;

  try {
    // 1. Von alter Schicht entfernen
    await authFetch("/api/shiftplan/unassign", {
      method: "POST",
      body: {
        staff_id: payload.staffId,
        shift_id: payload.sourceShiftId,
        year: props.year,
        week: props.week,
      },
    });

    // 2. Zu neuer Schicht zuweisen
    await authFetch("/api/shiftplan/assign", {
      method: "POST",
      body: {
        staff_id: payload.staffId,
        shift_id: props.shift.shift_id,
        year: props.year,
        week: props.week,
      },
    });

    emit("updated");
  } catch (e) {
    console.error("Drag & Drop fehlgeschlagen:", e);
  }
}

/** Ist diese Karte gerade ein gültiges Drop-Target? */
const isDropTarget = computed(() => {
  return dragState.isDragging && isValidDrop(props.shift.shift_id);
});

/** Wird gerade über diese Karte gehovert? */
const isHovering = computed(() => {
  return dragState.hoverShiftId === props.shift.shift_id;
});
</script>

<template>
  <div
      class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 border-l-4 px-3 py-2 flex items-center gap-3 transition-all duration-150"
      :class="{
        'ring-2 ring-blue-400 dark:ring-blue-500 ring-offset-1 dark:ring-offset-gray-900 bg-blue-50/50 dark:bg-blue-900/20': isHovering,
        'ring-1 ring-dashed ring-blue-300 dark:ring-blue-600': isDropTarget && !isHovering,
      }"
      :style="{ borderLeftColor: shift.color }"
      @dragover="onDragOver"
      @dragenter="onDragEnter"
      @dragleave="onDragLeave"
      @drop="onDrop"
  >
    <!-- Schicht Info - Fixed width -->
    <div class="w-32 flex-shrink-0">
      <div class="flex items-center gap-1">
        <span class="font-semibold text-gray-900 dark:text-white text-sm">{{ shift.name }}</span>
        <span v-if="isUnderstaffed" class="text-orange-500 text-xs">⚠</span>
      </div>
      <span class="text-xs text-gray-500 dark:text-gray-400">
        {{ shift.start_time }} - {{ shift.end_time }}
      </span>
    </div>

    <!-- Mitarbeiter - Flexible -->
    <div class="flex-1 flex flex-wrap items-center gap-1 min-w-0">
      <span
          v-for="staff in shift.assigned_staff"
          :key="staff.staff_id"
          class="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-300 transition-shadow"
          :class="{
            'cursor-grab active:cursor-grabbing hover:shadow-md hover:bg-gray-200 dark:hover:bg-gray-600': authStore.canEditShifts,
          }"
          :draggable="authStore.canEditShifts"
          @dragstart="onDragStart($event, staff.staff_id, staff.name)"
          @dragend="onDragEnd"
      >
        <span class="truncate">{{ staff.name }}</span>
        <button
            v-if="authStore.canEditShifts"
            class="text-gray-400 hover:text-red-500"
            @click.stop="unassignStaff(staff.staff_id)"
        >
          <Icon name="mdi:close" class="text-xs" />
        </button>
      </span>

      <!-- Zuweisen Button -->
      <button
          v-if="authStore.canEditShifts"
          class="inline-flex items-center gap-0.5 px-2 py-0.5 border border-dashed border-gray-300 dark:border-gray-600 rounded text-xs text-gray-400 hover:text-primary-light dark:hover:text-primary-dark hover:border-primary-light dark:hover:border-primary-dark transition-colors"
          @click="showAssignDialog = true"
      >
        <Icon name="mdi:plus" class="text-xs" />
      </button>
    </div>

    <!-- Assign Dialog -->
    <PrimeDialog
        v-model:visible="showAssignDialog"
        modal
        :header="`${shift.name} - Mitarbeiter zuweisen`"
        :style="{ width: '320px' }"
    >
      <div v-if="availableStaff.length === 0" class="text-center text-gray-500 py-4">
        Alle Mitarbeiter sind bereits zugewiesen
      </div>
      <div v-else class="space-y-1">
        <button
            v-for="s in availableStaff"
            :key="s.staff_id"
            class="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition-colors"
            :disabled="assigning"
            @click="assignStaff(s.staff_id)"
        >
          {{ s.name }}
          <span v-if="s.is_parttime" class="text-xs text-gray-400 ml-1">TZ</span>
        </button>
      </div>
    </PrimeDialog>
  </div>
</template>
