import type {
  RotationDropPayload,
  RotationStaffDragPayload,
  RotationTransferPayload,
} from "~/types/rotation";

/** Drag and drop of staff from the pool or between shifts and pattern weeks of the rotation board. */
export function useRotationPatternDragDrop() {
  const dataStore = useDataStore();

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

  function onChipDragStart({
    event,
    patternWeek,
    shiftId,
    staffId,
    staffName,
  }: RotationStaffDragPayload) {
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
      const data = JSON.parse(raw) as RotationTransferPayload;

      if (
        data.source === "rotation" &&
        data.sourceShiftId !== shiftId &&
        data.sourcePatternWeek === patternWeek &&
        data.sourceShiftId !== undefined
      ) {
        await dataStore.unassignFromRotation(patternWeek, data.staffId, data.sourceShiftId);
      } else if (
        data.source === "rotation" &&
        data.sourcePatternWeek !== patternWeek &&
        data.sourcePatternWeek !== undefined &&
        data.sourceShiftId !== undefined
      ) {
        await dataStore.unassignFromRotation(data.sourcePatternWeek, data.staffId, data.sourceShiftId);
      }

      await dataStore.assignToRotation(patternWeek, data.staffId, shiftId);
    } catch (error) {
      console.error("Drop fehlgeschlagen:", error);
    }
  }

  return { dragOverTarget, onPoolDragStart, onChipDragStart, onDragOver, onDragLeave, onDrop };
}
