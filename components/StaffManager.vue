<script setup lang="ts">
import type { Staff } from "~/types/staff";

const dataStore = useDataStore();

const showFormDialog = ref(false);
const editingStaff = ref<Staff | null>(null);
const showDeleteDialog = ref(false);
const staffToDelete = ref<Staff | null>(null);

function openCreateDialog() {
  editingStaff.value = null;
  showFormDialog.value = true;
}

function openEditDialog(staff: Staff) {
  editingStaff.value = staff;
  showFormDialog.value = true;
}

function openDeleteDialog(staff: Staff) {
  staffToDelete.value = staff;
  showDeleteDialog.value = true;
}

async function toggleActive(staff: Staff) {
  await dataStore.toggleStaffActive(staff.staff_id);
}
</script>

<template>
  <div class="space-y-4">
    <StaffManagementHeader
      :count="dataStore.staff.length"
      @create="openCreateDialog"
    />

    <StaffManagementList
      :staff="dataStore.staff"
      :loading="dataStore.loadingStaff"
      @edit="openEditDialog"
      @toggle-active="toggleActive"
      @delete="openDeleteDialog"
    />

    <StaffFormDialog
      :visible="showFormDialog"
      :staff="editingStaff"
      @update:visible="showFormDialog = $event"
    />

    <StaffDeleteDialog
      :visible="showDeleteDialog"
      :staff="staffToDelete"
      @update:visible="showDeleteDialog = $event"
    />
  </div>
</template>
