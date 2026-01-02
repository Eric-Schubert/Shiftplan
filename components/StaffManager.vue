<script setup lang="ts">
import type { Staff, StaffCreateDTO } from "~/types/staff";

// Lade Mitarbeiter
const { data: staffList, refresh } = await useFetch<Staff[]>("/api/staff");

// Form State
const showDialog = ref(false);
const editingStaff = ref<Staff | null>(null);
const form = ref<StaffCreateDTO>({
  name: "",
  active: 1,
  is_parttime: 0,
});

// Dialog öffnen
function openCreateDialog() {
  editingStaff.value = null;
  form.value = { name: "", active: 1, is_parttime: 0 };
  showDialog.value = true;
}

function openEditDialog(staff: Staff) {
  editingStaff.value = staff;
  form.value = {
    name: staff.name,
    active: staff.active,
    is_parttime: staff.is_parttime,
  };
  showDialog.value = true;
}

// Speichern
const saving = ref(false);

async function saveStaff() {
  if (!form.value.name.trim()) return;

  saving.value = true;
  try {
    if (editingStaff.value) {
      await $fetch(`/api/staff/${editingStaff.value.staff_id}`, {
        method: "PATCH",
        body: form.value,
      });
    } else {
      await $fetch("/api/staff", {
        method: "POST",
        body: form.value,
      });
    }
    await refresh();
    showDialog.value = false;
  } finally {
    saving.value = false;
  }
}

// Löschen
const confirmDelete = ref(false);
const staffToDelete = ref<Staff | null>(null);

function openDeleteConfirm(staff: Staff) {
  staffToDelete.value = staff;
  confirmDelete.value = true;
}

async function deleteStaff() {
  if (!staffToDelete.value) return;

  await $fetch(`/api/staff/${staffToDelete.value.staff_id}`, {
    method: "DELETE",
  });
  await refresh();
  confirmDelete.value = false;
  staffToDelete.value = null;
}

// Toggle Aktiv Status
async function toggleActive(staff: Staff) {
  await $fetch(`/api/staff/${staff.staff_id}`, {
    method: "PATCH",
    body: { active: staff.active ? 0 : 1 },
  });
  await refresh();
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <p class="text-gray-600 dark:text-gray-400">
        {{ staffList?.length || 0 }} Mitarbeiter
      </p>
      <PrimeButton
        label="Neuer Mitarbeiter"
        icon="pi pi-plus"
        size="small"
        @click="openCreateDialog"
      />
    </div>

    <!-- Liste -->
    <PrimeDataTable
      :value="staffList"
      striped-rows
      :paginator="staffList && staffList.length > 10"
      :rows="10"
    >
      <PrimeColumn field="name" header="Name" sortable>
        <template #body="{ data }">
          <span :class="{ 'opacity-50': !data.active }">{{ data.name }}</span>
        </template>
      </PrimeColumn>

      <PrimeColumn field="is_parttime" header="Arbeitszeit" sortable>
        <template #body="{ data }">
          <PrimeTag
            :value="data.is_parttime ? 'Teilzeit' : 'Vollzeit'"
            :severity="data.is_parttime ? 'secondary' : 'primary'"
          />
        </template>
      </PrimeColumn>

      <PrimeColumn field="active" header="Status" sortable>
        <template #body="{ data }">
          <PrimeTag
            :value="data.active ? 'Aktiv' : 'Inaktiv'"
            :severity="data.active ? 'success' : 'danger'"
          />
        </template>
      </PrimeColumn>

      <PrimeColumn header="Aktionen" style="width: 150px">
        <template #body="{ data }">
          <div class="flex gap-1">
            <PrimeButton
              icon="pi pi-pencil"
              text
              rounded
              size="small"
              @click="openEditDialog(data)"
            />
            <PrimeButton
              :icon="data.active ? 'pi pi-eye-slash' : 'pi pi-eye'"
              text
              rounded
              size="small"
              @click="toggleActive(data)"
              v-tooltip="data.active ? 'Deaktivieren' : 'Aktivieren'"
            />
            <PrimeButton
              icon="pi pi-trash"
              text
              rounded
              size="small"
              severity="danger"
              @click="openDeleteConfirm(data)"
            />
          </div>
        </template>
      </PrimeColumn>
    </PrimeDataTable>

    <!-- Create/Edit Dialog -->
    <PrimeDialog
      v-model:visible="showDialog"
      :header="editingStaff ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter'"
      modal
      :style="{ width: '25rem' }"
    >
      <div class="space-y-4">
        <div class="flex flex-col gap-2">
          <label class="font-medium">Name</label>
          <PrimeInputText v-model="form.name" placeholder="Name eingeben" />
        </div>

        <div class="flex items-center gap-2">
          <PrimeCheckbox
            v-model="form.is_parttime"
            input-id="parttime"
            :binary="true"
            :true-value="1"
            :false-value="0"
          />
          <label for="parttime">Teilzeit</label>
        </div>

        <div class="flex items-center gap-2" v-if="editingStaff">
          <PrimeCheckbox
            v-model="form.active"
            input-id="active"
            :binary="true"
            :true-value="1"
            :false-value="0"
          />
          <label for="active">Aktiv</label>
        </div>
      </div>

      <template #footer>
        <PrimeButton
          label="Abbrechen"
          text
          @click="showDialog = false"
        />
        <PrimeButton
          :label="editingStaff ? 'Speichern' : 'Erstellen'"
          :loading="saving"
          @click="saveStaff"
          :disabled="!form.name.trim()"
        />
      </template>
    </PrimeDialog>

    <!-- Delete Confirm Dialog -->
    <PrimeDialog
      v-model:visible="confirmDelete"
      header="Mitarbeiter löschen"
      modal
      :style="{ width: '25rem' }"
    >
      <p>
        Möchtest du <strong>{{ staffToDelete?.name }}</strong> wirklich löschen?
      </p>
      <template #footer>
        <PrimeButton label="Abbrechen" text @click="confirmDelete = false" />
        <PrimeButton label="Löschen" severity="danger" @click="deleteStaff" />
      </template>
    </PrimeDialog>
  </div>
</template>
