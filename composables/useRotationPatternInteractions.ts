import type {
  RotationAssignContext,
  RotationDropPayload,
  RotationStaffDragPayload,
  RotationTransferPayload,
} from "~/types/rotation";

export function useRotationPatternInteractions() {
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

  return {
    dragOverTarget,
    showAssignDialog,
    assignContext,
    assigning,
    availableStaffForAssign,
    openAssignDialog,
    assignStaff,
    unassignStaff,
    onPoolDragStart,
    onChipDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
  };
}
