<script setup lang="ts">
import type { Staff, StaffCreateDTO } from "~/types/staff";

const dataStore = useDataStore();

const showDialog = ref(false);
const editingStaff = ref<Staff | null>(null);
const form = ref<StaffCreateDTO>({ name: "", active: 1, is_parttime: 0 });
const saving = ref(false);

function openCreateDialog() {
  editingStaff.value = null;
  form.value = { name: "", active: 1, is_parttime: 0 };
  showDialog.value = true;
}

function openEditDialog(staff: Staff) {
  editingStaff.value = staff;
  form.value = { name: staff.name, active: staff.active, is_parttime: staff.is_parttime };
  showDialog.value = true;
}

async function saveStaff() {
  if (!form.value.name.trim()) return;
  saving.value = true;
  try {
    if (editingStaff.value) {
      await dataStore.updateStaff(editingStaff.value.staff_id, form.value);
    } else {
      await dataStore.createStaff(form.value);
    }
    showDialog.value = false;
  } finally {
    saving.value = false;
  }
}

const confirmDelete = ref(false);
const staffToDelete = ref<Staff | null>(null);

function openDeleteConfirm(staff: Staff) {
  staffToDelete.value = staff;
  confirmDelete.value = true;
}

async function deleteStaff() {
  if (!staffToDelete.value) return;
  await dataStore.deleteStaff(staffToDelete.value.staff_id);
  confirmDelete.value = false;
}

async function toggleActive(staff: Staff) {
  await dataStore.toggleStaffActive(staff.staff_id);
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <p class="text-gray-600 dark:text-gray-400">{{ dataStore.staff.length }} Mitarbeiter</p>
      <PrimeButton label="Neuer Mitarbeiter" icon="pi pi-plus" size="small" @click="openCreateDialog" />
    </div>

    <PrimeDataTable :value="dataStore.staff" striped-rows :loading="dataStore.loadingStaff" :paginator="dataStore.staff.length > 10" :rows="10">
      <PrimeColumn field="name" header="Name" sortable>
        <template #body="{ data }"><span :class="{ 'opacity-50': !data.active }">{{ data.name }}</span></template>
      </PrimeColumn>
      <PrimeColumn field="is_parttime" header="Arbeitszeit" sortable>
        <template #body="{ data }"><PrimeTag :value="data.is_parttime ? 'Teilzeit' : 'Vollzeit'" :severity="data.is_parttime ? 'secondary' : 'primary'" /></template>
      </PrimeColumn>
      <PrimeColumn field="active" header="Status" sortable>
        <template #body="{ data }"><PrimeTag :value="data.active ? 'Aktiv' : 'Inaktiv'" :severity="data.active ? 'success' : 'danger'" /></template>
      </PrimeColumn>
      <PrimeColumn header="Aktionen" style="width: 150px">
        <template #body="{ data }">
          <div class="flex gap-1">
            <PrimeButton icon="pi pi-pencil" text rounded size="small" @click="openEditDialog(data)" />
            <PrimeButton :icon="data.active ? 'pi pi-eye-slash' : 'pi pi-eye'" text rounded size="small" @click="toggleActive(data)" />
            <PrimeButton icon="pi pi-trash" text rounded size="small" severity="danger" @click="openDeleteConfirm(data)" />
          </div>
        </template>
      </PrimeColumn>
    </PrimeDataTable>

    <PrimeDialog v-model:visible="showDialog" :header="editingStaff ? 'Bearbeiten' : 'Neuer Mitarbeiter'" modal :style="{ width: '25rem' }">
      <div class="space-y-4">
        <div class="flex flex-col gap-2">
          <label class="font-medium">Name</label>
          <PrimeInputText v-model="form.name" placeholder="Name eingeben" />
        </div>
        <div class="flex items-center gap-2">
          <PrimeCheckbox v-model="form.is_parttime" input-id="parttime" :binary="true" :true-value="1" :false-value="0" />
          <label for="parttime">Teilzeit</label>
        </div>
      </div>
      <template #footer>
        <PrimeButton label="Abbrechen" text @click="showDialog = false" />
        <PrimeButton :label="editingStaff ? 'Speichern' : 'Erstellen'" :loading="saving" @click="saveStaff" :disabled="!form.name.trim()" />
      </template>
    </PrimeDialog>

    <PrimeDialog v-model:visible="confirmDelete" header="Löschen" modal :style="{ width: '25rem' }">
      <p>{{ staffToDelete?.name }} wirklich löschen?</p>
      <template #footer>
        <PrimeButton label="Abbrechen" text @click="confirmDelete = false" />
        <PrimeButton label="Löschen" severity="danger" @click="deleteStaff" />
      </template>
    </PrimeDialog>
  </div>
</template>
