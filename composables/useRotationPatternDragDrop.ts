import type { RotationTransferPayload } from "~/types/rotation";
import type { RotationDropPayload, RotationStaffDragPayload } from "~/types/rotation-drag";

/** What was dragged onto the board; anything dragged in from outside is ignored. */
function readPayload(event: DragEvent): RotationTransferPayload | null {
  try {
    return JSON.parse(event.dataTransfer?.getData("application/json") || "null") as RotationTransferPayload | null;
  } catch {
    return null;
  }
}

/** Drag and drop of staff from the pool or between shifts and pattern weeks of the rotation board. */
export function useRotationPatternDragDrop() {
  const dataStore = useDataStore();
  const { notify } = useErrorNotices();

  const dragOverTarget = ref<string | null>(null);

  function onPoolDragStart(event: DragEvent, staff: { staff_id: number; name: string }) {
    if (!event.dataTransfer) return;

    const payload: RotationTransferPayload = {
      staffId: staff.staff_id,
      staffName: staff.name,
      source: "pool",
    };

    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/json", JSON.stringify(payload));
  }

  function onChipDragStart({ event, patternWeek, shiftId, staffId, staffName }: RotationStaffDragPayload) {
    if (!event.dataTransfer) return;

    const payload: RotationTransferPayload = {
      staffId,
      staffName,
      source: "rotation",
      sourceShiftId: shiftId,
      sourcePatternWeek: patternWeek,
    };

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/json", JSON.stringify(payload));
  }

  function onDragOver({ event, patternWeek, shiftId }: RotationDropPayload) {
    event.preventDefault();
    dragOverTarget.value = `${patternWeek}-${shiftId}`;
  }

  // Leaving the window or cancelling with Escape has no related target; that counts as leaving too.
  function onDragLeave({ event, patternWeek, shiftId }: RotationDropPayload) {
    const relatedTarget = event.relatedTarget as HTMLElement | null;
    const currentTarget = event.currentTarget as HTMLElement | null;

    if (currentTarget && relatedTarget && currentTarget.contains(relatedTarget)) {
      return;
    }

    if (dragOverTarget.value === `${patternWeek}-${shiftId}`) {
      dragOverTarget.value = null;
    }
  }

  /** Every drag ends here, dropped or not, so no cell keeps its highlight. */
  function onDragEnd() {
    dragOverTarget.value = null;
  }

  async function onDrop({ event, patternWeek, shiftId }: RotationDropPayload) {
    event.preventDefault();
    dragOverTarget.value = null;

    const data = readPayload(event);
    if (!data) return;
    const from =
      data.source === "rotation" && data.sourcePatternWeek !== undefined && data.sourceShiftId !== undefined
        ? { week: data.sourcePatternWeek, shiftId: data.sourceShiftId }
        : null;
    if (from && from.week === patternWeek && from.shiftId === shiftId) return;

    // Adding to the new cell first: if removing from the old one fails, the person is in both, never in none.
    try {
      await dataStore.assignToRotation(patternWeek, data.staffId, shiftId);
      if (from) await dataStore.unassignFromRotation(from.week, data.staffId, from.shiftId);
    } catch (error) {
      notify(error, "settings.saveFailed");
      await dataStore.fetchRotation().catch(() => {});
    }
  }

  return { dragOverTarget, onPoolDragStart, onChipDragStart, onDragOver, onDragLeave, onDragEnd, onDrop };
}
