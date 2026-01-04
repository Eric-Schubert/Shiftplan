<script setup lang="ts">
import type { ShiftWithStaff } from "~/types/shiftplan";

const props = defineProps<{
  shift: ShiftWithStaff;
  year: number;
  week: number;
}>();

const emit = defineEmits<{ updated: [] }>();

const authStore = useAuthStore();
const dataStore = useDataStore();

const showAssignDialog = ref(false);
const assigning = ref(false);

// Verfügbare Mitarbeiter aus dem Store
const availableStaff = computed(() => {
  const assignedIds = props.shift.assigned_staff.map((s) => s.staff_id);
  return dataStore.activeStaff.filter((s) => !assignedIds.includes(s.staff_id));
});

async function assignStaff(staffId: number) {
  assigning.value = true;
  try {
    await $fetch("/api/shiftplan/assign", {
      method: "POST",
      body: { staff_id: staffId, shift_id: props.shift.shift_id, year: props.year, week: props.week },
    });
    emit("updated");
    showAssignDialog.value = false;
  } finally {
    assigning.value = false;
  }
}

async function unassignStaff(staffId: number) {
  await $fetch("/api/shiftplan/unassign", {
    method: "POST",
    body: { staff_id: staffId, shift_id: props.shift.shift_id, year: props.year, week: props.week },
  });
  emit("updated");
}

// Mindestbesetzung prüfen
const isUnderstaffed = computed(() => {
  return props.shift.assigned_staff.length < props.shift.min_staff;
});
</script>

<template>
  <div
      class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 border-l-4 px-3 py-2 flex items-center gap-3"
      :style="{ borderLeftColor: shift.color }"
  >
    <!-- Schicht Info - Fixed width -->
    <div class="w-32 flex-shrink-0">
      <div class="flex items-center gap-1">
        <span class="font-semibold text-gray-900 dark:text-white text-sm">{{ shift.name }}</span>
        <span v-if="isUnderstaffed" class="text-orange-500 text-xs">⚠</span>
      </div>
      <span class="text-xs text-gray-500 dark:text-gray-400">
        {{ shift.start_time }} - {{ shift.end_time }}
      </span>
    </div>

    <!-- Mitarbeiter - Flexible -->
    <div class="flex-1 flex flex-wrap items-center gap-1 min-w-0">
      <span
          v-for="staff in shift.assigned_staff"
          :key="staff.staff_id"
          class="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-300"
      >
        <span class="truncate">{{ staff.name }}</span>
        <button
            v-if="authStore.isAuthenticated"
            class="text-gray-400 hover:text-red-500"
            @click="unassignStaff(staff.staff_id)"
        >
          ×
        </button>
      </span>
      <span v-if="shift.assigned_staff.length === 0" class="text-xs text-gray-400 italic">
        –
      </span>
    </div>

    <!-- Add Button -->
    <PrimeButton
        v-if="authStore.isAuthenticated"
        icon="pi pi-plus"
        text
        rounded
        size="small"
        class="flex-shrink-0"
        @click="showAssignDialog = true"
    />

    <!-- Assign Dialog -->
    <PrimeDialog
        v-model:visible="showAssignDialog"
        :header="`${shift.name}`"
        modal
        :style="{ width: '18rem' }"
    >
      <div class="space-y-1 max-h-60 overflow-y-auto">
        <p v-if="availableStaff.length === 0" class="text-gray-500 text-sm py-2">
          Alle Mitarbeiter sind bereits zugewiesen.
        </p>
        <div
            v-for="staff in availableStaff"
            :key="staff.staff_id"
            class="flex justify-between items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
            @click="assignStaff(staff.staff_id)"
        >
          <span class="text-gray-900 dark:text-white text-sm">{{ staff.name }}</span>
          <PrimeTag
              v-if="staff.is_parttime"
              value="TZ"
              severity="secondary"
              class="text-xs"
          />
        </div>
      </div>
    </PrimeDialog>
  </div>
</template>