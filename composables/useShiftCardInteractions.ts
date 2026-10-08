import type { Ref } from "vue";
import type { ShiftWithStaff } from "~/types/shiftplan";
import { useShiftCardDragDrop } from "~/composables/useShiftCardDragDrop";

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

  const showAssignDialog = ref(false);
  const assigning = ref(false);

  const availableStaff = computed(() => {
    const assignedIds = shift.value.assigned_staff.map((staff) => staff.staff_id);
    return dataStore.activeStaff.filter((staff) => !assignedIds.includes(staff.staff_id));
  });

  const isUnderstaffed = computed(
    () => shift.value.assigned_staff.length < shift.value.min_staff
  );

  const shiftCardStyle = computed(() => ({
    "--shift-accent": shift.value.color,
  }));

  function sendAssignment(action: "assign" | "unassign", staffId: number, shiftId: number) {
    return authFetch(`/api/shiftplan/${action}`, {
      method: "POST",
      body: {
        staff_id: staffId,
        shift_id: shiftId,
        year: year.value,
        week: week.value,
      },
    });
  }

  async function assignStaff(staffId: number) {
    assigning.value = true;
    try {
      await sendAssignment("assign", staffId, shift.value.shift_id);

      onUpdated();
      showAssignDialog.value = false;
    } finally {
      assigning.value = false;
    }
  }

  async function unassignStaff(staffId: number) {
    await sendAssignment("unassign", staffId, shift.value.shift_id);

    onUpdated();
  }

  const dragDrop = useShiftCardDragDrop({
    shift,
    onMove: async (staffId, sourceShiftId) => {
      await sendAssignment("unassign", staffId, sourceShiftId);
      await sendAssignment("assign", staffId, shift.value.shift_id);

      onUpdated();
    },
  });

  return {
    showAssignDialog,
    assigning,
    availableStaff,
    isUnderstaffed,
    shiftCardStyle,
    assignStaff,
    unassignStaff,
    ...dragDrop,
  };
}
