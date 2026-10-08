import type { Ref } from "vue";
import type { ShiftWithStaff } from "~/types/shiftplan";
import { useDragDrop } from "~/composables/useDragDrop";

interface ShiftCardDragDropOptions {
  shift: Ref<ShiftWithStaff>;
  /** Moves a dropped person from their source shift onto this one. */
  onMove: (staffId: number, sourceShiftId: number) => Promise<void>;
}

/** Drag handlers of one shift card: people can be dragged from one shift onto another. */
export function useShiftCardDragDrop({ shift, onMove }: ShiftCardDragDropOptions) {
  const {
    state: dragState,
    startDrag,
    endDrag,
    setHoverShift,
    getPayload,
    isValidDrop,
  } = useDragDrop();

  const isDropTarget = computed(
    () => dragState.isDragging && isValidDrop(shift.value.shift_id)
  );

  const isHovering = computed(
    () => dragState.hoverShiftId === shift.value.shift_id
  );

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

  function markDropTarget(event: DragEvent) {
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
      await onMove(payload.staffId, payload.sourceShiftId);
    } catch (error) {
      console.error("Drag and drop failed", error);
    }
  }

  return {
    isDropTarget,
    isHovering,
    onDragStart,
    onDragEnd,
    onDragOver: markDropTarget,
    onDragEnter: markDropTarget,
    onDragLeave,
    onDrop,
  };
}
