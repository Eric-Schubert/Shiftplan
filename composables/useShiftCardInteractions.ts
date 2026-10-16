import type { Ref } from "vue";
import type { ShiftWithStaff } from "~/types/shiftplan";
import { useShiftCardDragDrop } from "~/composables/useShiftCardDragDrop";

interface ShiftCardInteractionOptions {
  shift: Ref<ShiftWithStaff>;
  year: Ref<number>;
  week: Ref<number>;
  onUpdated: () => void;
}

export function useShiftCardInteractions({ shift, year, week, onUpdated }: ShiftCardInteractionOptions) {
  const dataStore = useDataStore();
  const { authFetch } = useAuthFetch();
  const { notify } = useErrorNotices();

  const showAssignDialog = ref(false);
  const assigning = ref(false);

  const availableStaff = computed(() => {
    const assignedIds = shift.value.assigned_staff.map((staff) => staff.staff_id);
    return dataStore.activeStaff.filter((staff) => !assignedIds.includes(staff.staff_id));
  });

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

  /** Runs a change and reloads the week either way, so a failed change shows what was really saved. */
  async function change(run: () => Promise<unknown>): Promise<boolean> {
    try {
      await run();
      return true;
    } catch (error) {
      notify(error, "planner.shift.changeFailed");
      return false;
    } finally {
      onUpdated();
    }
  }

  async function assignStaff(staffId: number) {
    assigning.value = true;
    if (await change(() => sendAssignment("assign", staffId, shift.value.shift_id))) showAssignDialog.value = false;
    assigning.value = false;
  }

  async function unassignStaff(staffId: number) {
    await change(() => sendAssignment("unassign", staffId, shift.value.shift_id));
  }

  const dragDrop = useShiftCardDragDrop({
    shift,
    onMove: async (staffId, sourceShiftId) => {
      await change(async () => {
        await sendAssignment("unassign", staffId, sourceShiftId);
        await sendAssignment("assign", staffId, shift.value.shift_id);
      });
    },
  });

  return {
    showAssignDialog,
    assigning,
    availableStaff,
    shiftCardStyle,
    assignStaff,
    unassignStaff,
    ...dragDrop,
  };
}
