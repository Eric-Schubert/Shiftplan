/**
 * useDragDrop Composable
 *
 * Verwaltet den globalen Drag-State für Mitarbeiter-Zuweisungen
 * zwischen Schichten. Nutzt HTML5 Drag & Drop API (Desktop).
 */
import { reactive, readonly } from "vue";

interface DragPayload {
  staffId: number;
  staffName: string;
  sourceShiftId: number;
}

const state = reactive({
  isDragging: false,
  payload: null as DragPayload | null,
  /** Shift-ID über der gerade gehovert wird */
  hoverShiftId: null as number | null,
});

export function useDragDrop() {
  function startDrag(event: DragEvent, payload: DragPayload) {
    if (!event.dataTransfer) return;

    state.isDragging = true;
    state.payload = payload;

    // Daten für den Transfer setzen
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/json", JSON.stringify(payload));

    // Dezentes Drag-Image
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

  /** Prüft ob ein Drop auf diese Schicht sinnvoll ist (nicht die gleiche Schicht) */
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
