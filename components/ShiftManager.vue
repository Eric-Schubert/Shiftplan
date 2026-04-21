<script setup lang="ts">
import type { Shift } from "~/types/shift";

const dataStore = useDataStore();

const showFormDialog = ref(false);
const editingShift = ref<Shift | null>(null);
const showDeleteDialog = ref(false);
const shiftToDelete = ref<Shift | null>(null);

function openCreateDialog() {
  editingShift.value = null;
  showFormDialog.value = true;
}

function openEditDialog(shift: Shift) {
  editingShift.value = shift;
  showFormDialog.value = true;
}

function openDeleteDialog(shift: Shift) {
  shiftToDelete.value = shift;
  showDeleteDialog.value = true;
}

async function toggleActive(shift: Shift) {
  await dataStore.toggleShiftActive(shift.shift_id);
}
</script>

<template>
  <div class="space-y-4">
    <ShiftManagementHeader
      :count="dataStore.shifts.length"
      @create="openCreateDialog"
    />

    <ShiftManagementList
      :shifts="dataStore.shifts"
      :loading="dataStore.loadingShifts"
      @edit="openEditDialog"
      @toggle-active="toggleActive"
      @delete="openDeleteDialog"
    />

    <ShiftFormDialog
      :visible="showFormDialog"
      :shift="editingShift"
      :next-sort-order="dataStore.shifts.length + 1"
      @update:visible="showFormDialog = $event"
    />

    <ShiftDeleteDialog
      :visible="showDeleteDialog"
      :shift="shiftToDelete"
      @update:visible="showDeleteDialog = $event"
    />
  </div>
</template>
