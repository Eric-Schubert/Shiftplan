import type { RotationAssignContext } from "~/types/rotation";
import { useRotationPatternDragDrop } from "~/composables/useRotationPatternDragDrop";

export function useRotationPatternInteractions() {
  const dataStore = useDataStore();

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

  return {
    ...useRotationPatternDragDrop(),
    showAssignDialog,
    assignContext,
    assigning,
    availableStaffForAssign,
    openAssignDialog,
    assignStaff,
    unassignStaff,
  };
}
