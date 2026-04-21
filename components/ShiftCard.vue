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

const availableStaff = computed(() => {
  const assignedIds = props.shift.assigned_staff.map((staff) => staff.staff_id);
  return dataStore.activeStaff.filter((staff) => !assignedIds.includes(staff.staff_id));
});

const isUnderstaffed = computed(() => props.shift.assigned_staff.length < props.shift.min_staff);

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

async function onDrop(event: DragEvent) {
  event.preventDefault();
  setHoverShift(null);

  const payload = getPayload();
  if (!payload || payload.sourceShiftId === props.shift.shift_id) return;

  try {
    await authFetch("/api/shiftplan/unassign", {
      method: "POST",
      body: {
        staff_id: payload.staffId,
        shift_id: payload.sourceShiftId,
        year: props.year,
        week: props.week,
      },
    });

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
  } catch (error) {
    console.error("Drag and drop failed", error);
  }
}

const isDropTarget = computed(() => dragState.isDragging && isValidDrop(props.shift.shift_id));
const isHovering = computed(() => dragState.hoverShiftId === props.shift.shift_id);
const shiftCardStyle = computed(() => ({
  "--shift-accent": props.shift.color,
}));
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
              <Icon name="mdi:clock-outline" class="text-sm" />
              <span>{{ shift.start_time }} - {{ shift.end_time }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-end gap-2 sm:gap-2.5">
        <span
          v-for="staff in shift.assigned_staff"
          :key="staff.staff_id"
          class="planner-assignee inline-flex min-h-10 items-center gap-2 rounded-full px-3 py-1 text-sm shadow-sm sm:min-h-11 sm:py-1.5"
          :class="{
            'cursor-grab active:cursor-grabbing hover:border-[var(--accent)] hover:bg-[var(--surface)]': authStore.canEditShifts,
          }"
          :draggable="authStore.canEditShifts"
          @dragstart="onDragStart($event, staff.staff_id, staff.name)"
          @dragend="onDragEnd"
        >
          <span class="planner-assignee__name max-w-[11rem] truncate font-medium sm:max-w-[14rem]">{{ staff.name }}</span>
          <button
            v-if="authStore.canEditShifts"
            type="button"
            class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--text-3)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger-ink)]"
            :aria-label="`${staff.name} aus ${shift.name} entfernen`"
            @click.stop="unassignStaff(staff.staff_id)"
          >
            <Icon name="mdi:close" class="text-xs" />
          </button>
        </span>

        <button
          v-if="authStore.canEditShifts"
          type="button"
          class="planner-pill-button border-dashed"
          :aria-label="`Mitarbeiter zu ${shift.name} hinzufügen`"
          @click="showAssignDialog = true"
        >
          <Icon name="mdi:plus" class="text-sm" />
          <span>Hinzufügen</span>
        </button>
      </div>
    </div>

    <PrimeDialog
      v-model:visible="showAssignDialog"
      modal
      :header="`${shift.name} - Mitarbeiter zuweisen`"
      :style="{ width: '24rem', maxWidth: 'calc(100vw - 1.5rem)' }"
    >
      <div v-if="availableStaff.length === 0" class="planner-empty !py-8">
        <Icon name="mdi:account-check-outline" class="text-3xl text-[var(--text-3)]" />
        <p class="text-sm">Alle verfügbaren Mitarbeiter sind dieser Schicht bereits zugeordnet.</p>
      </div>
      <div v-else class="space-y-2">
        <button
          v-for="staffMember in availableStaff"
          :key="staffMember.staff_id"
          type="button"
          class="flex w-full items-center justify-between rounded-[18px] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-left text-sm text-[var(--text-2)] transition hover:border-[var(--accent)] hover:bg-[var(--surface-muted)]"
          :disabled="assigning"
          @click="assignStaff(staffMember.staff_id)"
        >
          <span class="font-medium text-[var(--text-1)]">{{ staffMember.name }}</span>
          <span
            v-if="staffMember.is_parttime"
            class="rounded-full bg-[var(--surface-muted)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-3)]"
          >
            TZ
          </span>
        </button>
      </div>
    </PrimeDialog>
  </div>
</template>
