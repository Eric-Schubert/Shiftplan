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
      <PrimeButton label="Neuer Mitarbeiter" icon="pi pi-plus" class="min-h-11" @click="openCreateDialog" />
    </div>

    <div class="space-y-3 sm:hidden">
      <div
        v-for="staffMember in dataStore.staff"
        :key="staffMember.staff_id"
        class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-2">
            <p class="text-sm font-semibold text-gray-900 dark:text-white" :class="{ 'opacity-50': !staffMember.active }">
              {{ staffMember.name }}
            </p>
            <div class="flex flex-wrap gap-2">
              <PrimeTag :value="staffMember.is_parttime ? 'Teilzeit' : 'Vollzeit'" :severity="staffMember.is_parttime ? 'secondary' : 'primary'" />
              <PrimeTag :value="staffMember.active ? 'Aktiv' : 'Inaktiv'" :severity="staffMember.active ? 'success' : 'danger'" />
            </div>
          </div>
          <div class="flex flex-wrap justify-end gap-2">
            <PrimeButton label="Bearbeiten" severity="secondary" outlined class="min-h-10" @click="openEditDialog(staffMember)" />
            <PrimeButton
              :label="staffMember.active ? 'Deaktivieren' : 'Aktivieren'"
              severity="secondary"
              outlined
              class="min-h-10"
              @click="toggleActive(staffMember)"
            />
            <PrimeButton label="Löschen" severity="danger" outlined class="min-h-10" @click="openDeleteConfirm(staffMember)" />
          </div>
        </div>
      </div>
    </div>

    <div class="hidden sm:block">
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
        <PrimeColumn header="Aktionen" style="width: 180px">
          <template #body="{ data }">
            <div class="flex gap-1">
              <PrimeButton icon="pi pi-pencil" text rounded class="!h-10 !w-10" aria-label="Mitarbeiter bearbeiten" @click="openEditDialog(data)" />
              <PrimeButton
                :icon="data.active ? 'pi pi-eye-slash' : 'pi pi-eye'"
                text
                rounded
                class="!h-10 !w-10"
                :aria-label="data.active ? 'Mitarbeiter deaktivieren' : 'Mitarbeiter aktivieren'"
                @click="toggleActive(data)"
              />
              <PrimeButton icon="pi pi-trash" text rounded class="!h-10 !w-10" severity="danger" aria-label="Mitarbeiter löschen" @click="openDeleteConfirm(data)" />
            </div>
          </template>
        </PrimeColumn>
      </PrimeDataTable>
    </div>

    <PrimeDialog
      v-model:visible="showDialog"
      :header="editingStaff ? 'Mitarbeiter bearbeiten' : 'Mitarbeiter anlegen'"
      modal
      :style="{ width: '26rem', maxWidth: 'calc(100vw - 1.5rem)' }"
    >
      <div class="space-y-4">
        <div class="flex flex-col gap-2">
          <label for="staff-name" class="font-medium">Name</label>
          <PrimeInputText id="staff-name" v-model="form.name" placeholder="Vollständigen Namen eingeben" />
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

    <PrimeDialog v-model:visible="confirmDelete" header="Mitarbeiter löschen" modal :style="{ width: '26rem', maxWidth: 'calc(100vw - 1.5rem)' }">
      <p>{{ staffToDelete?.name }} wirklich löschen? Bereits geplante Einsätze dieses Mitarbeiters gehen dabei verloren.</p>
      <template #footer>
        <PrimeButton label="Abbrechen" text @click="confirmDelete = false" />
        <PrimeButton label="Mitarbeiter löschen" severity="danger" class="min-h-11" @click="deleteStaff" />
      </template>
    </PrimeDialog>
  </div>
</template>
