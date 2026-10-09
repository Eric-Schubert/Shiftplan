<script setup lang="ts">
import type { Staff } from "~/types/staff";

const dataStore = useDataStore();

const showFormDialog = ref(false);
const editingStaff = ref<Staff | null>(null);
const showDeleteDialog = ref(false);
const staffToDelete = ref<Staff | null>(null);
const showDeactivateDialog = ref(false);
const staffToDeactivate = ref<Staff | null>(null);

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

// Deactivating signs out every device and deletes the PIN, so it asks first. Activating does not.
async function toggleActive(staff: Staff) {
  if (staff.active) {
    staffToDeactivate.value = staff;
    showDeactivateDialog.value = true;
    return;
  }
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

    <StaffDeactivateDialog
      :visible="showDeactivateDialog"
      :staff="staffToDeactivate"
      @update:visible="showDeactivateDialog = $event"
    />
  </div>
</template>
