<script setup lang="ts">
import type { Shift, ShiftCreateDTO } from "~/types/shift";

// Lade Schichten
const { data: shiftList, refresh } = await useFetch<Shift[]>("/api/shift");

// Form State
const showDialog = ref(false);
const editingShift = ref<Shift | null>(null);
const form = ref<ShiftCreateDTO>({
  name: "",
  start_time: "08:00",
  end_time: "16:00",
  color: "#6366f1",
  min_staff: 1,
  sort_order: 0,
});

// Farb-Optionen
const colorOptions = [
  { label: "Grün", value: "#22c55e" },
  { label: "Blau", value: "#3b82f6" },
  { label: "Violett", value: "#8b5cf6" },
  { label: "Orange", value: "#f97316" },
  { label: "Rot", value: "#ef4444" },
  { label: "Cyan", value: "#06b6d4" },
];

// Dialog öffnen
function openCreateDialog() {
  editingShift.value = null;
  form.value = {
    name: "",
    start_time: "08:00",
    end_time: "16:00",
    color: "#6366f1",
    min_staff: 1,
    sort_order: (shiftList.value?.length || 0) + 1,
  };
  showDialog.value = true;
}

function openEditDialog(shift: Shift) {
  editingShift.value = shift;
  form.value = {
    name: shift.name,
    start_time: shift.start_time,
    end_time: shift.end_time,
    color: shift.color,
    min_staff: shift.min_staff,
    sort_order: shift.sort_order,
  };
  showDialog.value = true;
}

// Speichern
const saving = ref(false);

async function saveShift() {
  if (!form.value.name.trim()) return;

  saving.value = true;
  try {
    if (editingShift.value) {
      await $fetch(`/api/shift/${editingShift.value.shift_id}`, {
        method: "PATCH",
        body: form.value,
      });
    } else {
      await $fetch("/api/shift", {
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
const shiftToDelete = ref<Shift | null>(null);

function openDeleteConfirm(shift: Shift) {
  shiftToDelete.value = shift;
  confirmDelete.value = true;
}

async function deleteShift() {
  if (!shiftToDelete.value) return;

  await $fetch(`/api/shift/${shiftToDelete.value.shift_id}`, {
    method: "DELETE",
  });
  await refresh();
  confirmDelete.value = false;
  shiftToDelete.value = null;
}

// Toggle Aktiv Status
async function toggleActive(shift: Shift) {
  await $fetch(`/api/shift/${shift.shift_id}`, {
    method: "PATCH",
    body: { active: shift.active ? 0 : 1 },
  });
  await refresh();
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <p class="text-gray-600 dark:text-gray-400">
        {{ shiftList?.length || 0 }} Schichten
      </p>
      <PrimeButton
        label="Neue Schicht"
        icon="pi pi-plus"
        size="small"
        @click="openCreateDialog"
      />
    </div>

    <!-- Liste -->
    <PrimeDataTable
      :value="shiftList"
      striped-rows
      :paginator="shiftList && shiftList.length > 10"
      :rows="10"
    >
      <PrimeColumn header="" style="width: 40px">
        <template #body="{ data }">
          <div
            class="w-4 h-4 rounded-full"
            :style="{ backgroundColor: data.color }"
          />
        </template>
      </PrimeColumn>

      <PrimeColumn field="name" header="Name" sortable>
        <template #body="{ data }">
          <span :class="{ 'opacity-50': !data.active }">{{ data.name }}</span>
        </template>
      </PrimeColumn>

      <PrimeColumn header="Zeit">
        <template #body="{ data }">
          {{ data.start_time }} - {{ data.end_time }} Uhr
        </template>
      </PrimeColumn>

      <PrimeColumn field="min_staff" header="Min. Mitarbeiter" sortable />

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
      :header="editingShift ? 'Schicht bearbeiten' : 'Neue Schicht'"
      modal
      :style="{ width: '30rem' }"
    >
      <div class="space-y-4">
        <div class="flex flex-col gap-2">
          <label class="font-medium">Name</label>
          <PrimeInputText v-model="form.name" placeholder="z.B. Frühschicht" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-2">
            <label class="font-medium">Start</label>
            <PrimeInputText v-model="form.start_time" type="time" />
          </div>
          <div class="flex flex-col gap-2">
            <label class="font-medium">Ende</label>
            <PrimeInputText v-model="form.end_time" type="time" />
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <label class="font-medium">Farbe</label>
          <div class="flex gap-2">
            <button
              v-for="color in colorOptions"
              :key="color.value"
              class="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
              :class="{
                'border-gray-900 dark:border-white scale-110': form.color === color.value,
                'border-transparent': form.color !== color.value,
              }"
              :style="{ backgroundColor: color.value }"
              @click="form.color = color.value"
            />
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <label class="font-medium">Minimale Mitarbeiter</label>
          <PrimeInputNumber
            v-model="form.min_staff"
            :min="1"
            :max="10"
            show-buttons
          />
        </div>
      </div>

      <template #footer>
        <PrimeButton label="Abbrechen" text @click="showDialog = false" />
        <PrimeButton
          :label="editingShift ? 'Speichern' : 'Erstellen'"
          :loading="saving"
          @click="saveShift"
          :disabled="!form.name.trim()"
        />
      </template>
    </PrimeDialog>

    <!-- Delete Confirm Dialog -->
    <PrimeDialog
      v-model:visible="confirmDelete"
      header="Schicht löschen"
      modal
      :style="{ width: '25rem' }"
    >
      <p>
        Möchtest du die Schicht <strong>{{ shiftToDelete?.name }}</strong> wirklich löschen?
      </p>
      <template #footer>
        <PrimeButton label="Abbrechen" text @click="confirmDelete = false" />
        <PrimeButton label="Löschen" severity="danger" @click="deleteShift" />
      </template>
    </PrimeDialog>
  </div>
</template>
