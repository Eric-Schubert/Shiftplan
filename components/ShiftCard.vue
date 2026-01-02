<script setup lang="ts">
import type { ShiftWithStaff } from "~/types/shiftplan";
import type { Staff } from "~/types/staff";

const props = defineProps<{
  shift: ShiftWithStaff;
  year: number;
  week: number;
}>();

const emit = defineEmits<{
  updated: [];
}>();

// Lade alle verfügbaren Mitarbeiter
const { data: allStaff } = await useFetch<Staff[]>("/api/staff");

// Dialog State
const showAssignDialog = ref(false);
const assigning = ref(false);

// Verfügbare Mitarbeiter (nicht bereits zugewiesen)
const availableStaff = computed(() => {
  if (!allStaff.value) return [];
  const assignedIds = props.shift.assigned_staff.map((s) => s.staff_id);
  return allStaff.value.filter(
    (s) => s.active && !assignedIds.includes(s.staff_id)
  );
});

// Mitarbeiter zuweisen
async function assignStaff(staffId: number) {
  assigning.value = true;
  try {
    await $fetch("/api/shiftplan/assign", {
      method: "POST",
      body: {
        staff_id: staffId,
        shift_id: props.shift.shift_id,
        year: props.year,
        week: props.week,
      },
    });
    emit("updated");
    showAssignDialog.value = false;
  } finally {
    assigning.value = false;
  }
}

// Mitarbeiter entfernen
async function unassignStaff(staffId: number) {
  await $fetch("/api/shiftplan/unassign", {
    method: "POST",
    body: {
      staff_id: staffId,
      shift_id: props.shift.shift_id,
      year: props.year,
      week: props.week,
    },
  });
  emit("updated");
}
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 overflow-hidden">
    <!-- Header -->
    <div
      class="px-4 py-3 flex justify-between items-center"
      :style="{ borderLeft: `4px solid ${shift.color}` }"
    >
      <div>
        <h3 class="font-semibold text-gray-900 dark:text-white">
          {{ shift.name }}
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ shift.start_time }} - {{ shift.end_time }} Uhr ·
          Min. {{ shift.min_staff }} Mitarbeiter
        </p>
      </div>

      <PrimeButton
        icon="pi pi-plus"
        text
        rounded
        size="small"
        @click="showAssignDialog = true"
        v-tooltip="'Mitarbeiter hinzufügen'"
        :disabled="availableStaff.length === 0"
      />
    </div>

    <!-- Zugewiesene Mitarbeiter -->
    <div class="px-4 py-3 border-t dark:border-gray-700">
      <div v-if="shift.assigned_staff.length === 0" class="text-gray-400 text-sm">
        Keine Mitarbeiter zugewiesen
      </div>
      <div v-else class="flex flex-wrap gap-2">
        <PrimeChip
          v-for="staff in shift.assigned_staff"
          :key="staff.staff_id"
          :label="staff.name"
          removable
          @remove="unassignStaff(staff.staff_id)"
        />
      </div>
    </div>

    <!-- Warnung wenn zu wenig Mitarbeiter -->
    <div
      v-if="shift.assigned_staff.length < shift.min_staff"
      class="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-t dark:border-gray-700"
    >
      <p class="text-sm text-yellow-700 dark:text-yellow-400">
        <Icon name="mdi:alert" class="mr-1" />
        Es fehlen {{ shift.min_staff - shift.assigned_staff.length }} Mitarbeiter
      </p>
    </div>

    <!-- Assign Dialog -->
    <PrimeDialog
      v-model:visible="showAssignDialog"
      header="Mitarbeiter zuweisen"
      modal
      :style="{ width: '25rem' }"
    >
      <div class="space-y-2">
        <p v-if="availableStaff.length === 0" class="text-gray-500">
          Alle Mitarbeiter sind bereits zugewiesen.
        </p>
        <div
          v-for="staff in availableStaff"
          :key="staff.staff_id"
          class="flex justify-between items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
          @click="assignStaff(staff.staff_id)"
        >
          <span class="text-gray-900 dark:text-white">{{ staff.name }}</span>
          <PrimeTag
            v-if="staff.is_parttime"
            value="Teilzeit"
            severity="secondary"
            class="text-xs"
          />
        </div>
      </div>
    </PrimeDialog>
  </div>
</template>
