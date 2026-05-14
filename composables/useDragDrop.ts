


import { reactive, readonly } from "vue";

interface DragPayload {
  staffId: number;
  staffName: string;
  sourceShiftId: number;
}

const state = reactive({
  isDragging: false,
  payload: null as DragPayload | null,

  hoverShiftId: null as number | null,
});

export function useDragDrop() {
  function startDrag(event: DragEvent, payload: DragPayload) {
    if (!event.dataTransfer) return;

    state.isDragging = true;
    state.payload = payload;


    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/json", JSON.stringify(payload));


    const el = event.target as HTMLElement;
    if (el) {
      event.dataTransfer.setDragImage(el, el.offsetWidth / 2, el.offsetHeight / 2);
    }
  }

  function endDrag() {
    state.isDragging = false;
    state.payload = null;
    state.hoverShiftId = null;
  }

  function setHoverShift(shiftId: number | null) {
    state.hoverShiftId = shiftId;
  }

  function getPayload(): DragPayload | null {
    return state.payload;
  }


  function isValidDrop(targetShiftId: number): boolean {
    return state.payload !== null && state.payload.sourceShiftId !== targetShiftId;
  }

  return {
    state: readonly(state),
    startDrag,
    endDrag,
    setHoverShift,
    getPayload,
    isValidDrop,
  };
}
