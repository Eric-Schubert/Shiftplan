import type { Ref } from "vue";
import type { ShiftWithStaff } from "~/types/shiftplan";
import { useDragDrop } from "~/composables/useDragDrop";

interface ShiftCardInteractionOptions {
  shift: Ref<ShiftWithStaff>;
  year: Ref<number>;
  week: Ref<number>;
  onUpdated: () => void;
}

export function useShiftCardInteractions({
  shift,
  year,
  week,
  onUpdated,
}: ShiftCardInteractionOptions) {
  const dataStore = useDataStore();
  const { authFetch } = useAuthFetch();
  const {
    state: dragState,
    startDrag,
    endDrag,
    setHoverShift,
    getPayload,
    isValidDrop,
  } = useDragDrop();

  const showAssignDialog = ref(false);
  const assigning = ref(false);

  const availableStaff = computed(() => {
    const assignedIds = shift.value.assigned_staff.map((staff) => staff.staff_id);
    return dataStore.activeStaff.filter((staff) => !assignedIds.includes(staff.staff_id));
  });

  const isUnderstaffed = computed(
    () => shift.value.assigned_staff.length < shift.value.min_staff
  );

  const isDropTarget = computed(
    () => dragState.isDragging && isValidDrop(shift.value.shift_id)
  );

  const isHovering = computed(
    () => dragState.hoverShiftId === shift.value.shift_id
  );

  const shiftCardStyle = computed(() => ({
    "--shift-accent": shift.value.color,
  }));

  async function assignStaff(staffId: number) {
    assigning.value = true;
    try {
      await authFetch("/api/shiftplan/assign", {
        method: "POST",
        body: {
          staff_id: staffId,
          shift_id: shift.value.shift_id,
          year: year.value,
          week: week.value,
        },
      });

      onUpdated();
      showAssignDialog.value = false;
    } finally {
      assigning.value = false;
    }
  }

  async function unassignStaff(staffId: number) {
    await authFetch("/api/shiftplan/unassign", {
      method: "POST",
      body: {
        staff_id: staffId,
        shift_id: shift.value.shift_id,
        year: year.value,
        week: week.value,
      },
    });

    onUpdated();
  }

  function onDragStart(event: DragEvent, staffId: number, staffName: string) {
    startDrag(event, {
      staffId,
      staffName,
      sourceShiftId: shift.value.shift_id,
    });
  }

  function onDragEnd() {
    endDrag();
  }

  function onDragOver(event: DragEvent) {
    if (!isValidDrop(shift.value.shift_id)) return;

    event.preventDefault();
    setHoverShift(shift.value.shift_id);
  }

  function onDragEnter(event: DragEvent) {
    if (!isValidDrop(shift.value.shift_id)) return;

    event.preventDefault();
    setHoverShift(shift.value.shift_id);
  }

  function onDragLeave(event: DragEvent) {
    const relatedTarget = event.relatedTarget as HTMLElement | null;
    const currentTarget = event.currentTarget as HTMLElement;

    if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
      if (dragState.hoverShiftId === shift.value.shift_id) {
        setHoverShift(null);
      }
    }
  }

  async function onDrop(event: DragEvent) {
    event.preventDefault();
    setHoverShift(null);

    const payload = getPayload();
    if (!payload || payload.sourceShiftId === shift.value.shift_id) return;

    try {
      await authFetch("/api/shiftplan/unassign", {
        method: "POST",
        body: {
          staff_id: payload.staffId,
          shift_id: payload.sourceShiftId,
          year: year.value,
          week: week.value,
        },
      });

      await authFetch("/api/shiftplan/assign", {
        method: "POST",
        body: {
          staff_id: payload.staffId,
          shift_id: shift.value.shift_id,
          year: year.value,
          week: week.value,
        },
      });

      onUpdated();
    } catch (error) {
      console.error("Drag and drop failed", error);
    }
  }

  return {
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
  };
}
