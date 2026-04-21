<script setup lang="ts">
import type { Shift, ShiftCreateDTO } from "~/types/shift";

const dataStore = useDataStore();

const showDialog = ref(false);
const editingShift = ref<Shift | null>(null);
const form = ref<ShiftCreateDTO>({ name: "", start_time: "08:00", end_time: "16:00", color: "#6366f1", min_staff: 1, sort_order: 0 });
const saving = ref(false);

const colorOptions = [
  { value: "#22c55e" }, { value: "#3b82f6" }, { value: "#8b5cf6" },
  { value: "#f97316" }, { value: "#ef4444" }, { value: "#06b6d4" },
];

function openCreateDialog() {
  editingShift.value = null;
  form.value = { name: "", start_time: "08:00", end_time: "16:00", color: "#6366f1", min_staff: 1, sort_order: dataStore.shifts.length + 1 };
  showDialog.value = true;
}

function openEditDialog(shift: Shift) {
  editingShift.value = shift;
  form.value = { name: shift.name, start_time: shift.start_time, end_time: shift.end_time, color: shift.color, min_staff: shift.min_staff, sort_order: shift.sort_order };
  showDialog.value = true;
}

async function saveShift() {
  if (!form.value.name.trim()) return;
  saving.value = true;
  try {
    if (editingShift.value) {
      await dataStore.updateShift(editingShift.value.shift_id, form.value);
    } else {
      await dataStore.createShift(form.value);
    }
    showDialog.value = false;
  } finally {
    saving.value = false;
  }
}

const confirmDelete = ref(false);
const shiftToDelete = ref<Shift | null>(null);

function openDeleteConfirm(shift: Shift) {
  shiftToDelete.value = shift;
  confirmDelete.value = true;
}

async function deleteShift() {
  if (!shiftToDelete.value) return;
  await dataStore.deleteShift(shiftToDelete.value.shift_id);
  confirmDelete.value = false;
}

async function toggleActive(shift: Shift) {
  await dataStore.toggleShiftActive(shift.shift_id);
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <p class="text-gray-600 dark:text-gray-400">{{ dataStore.shifts.length }} Schichten</p>
      <PrimeButton label="Neue Schicht" icon="pi pi-plus" class="min-h-11" @click="openCreateDialog" />
    </div>

    <div class="space-y-3 sm:hidden">
      <div
        v-for="shift in dataStore.shifts"
        :key="shift.shift_id"
        class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <span class="h-3 w-3 rounded-full" :style="{ backgroundColor: shift.color }"></span>
              <p class="text-sm font-semibold text-gray-900 dark:text-white" :class="{ 'opacity-50': !shift.active }">
                {{ shift.name }}
              </p>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-300">{{ shift.start_time }} - {{ shift.end_time }} Uhr</p>
            <div class="flex flex-wrap gap-2">
              <PrimeTag :value="`${shift.min_staff} Min. MA`" severity="secondary" />
              <PrimeTag :value="shift.active ? 'Aktiv' : 'Inaktiv'" :severity="shift.active ? 'success' : 'danger'" />
            </div>
          </div>
          <div class="flex flex-wrap justify-end gap-2">
            <PrimeButton label="Bearbeiten" severity="secondary" outlined class="min-h-10" @click="openEditDialog(shift)" />
            <PrimeButton
              :label="shift.active ? 'Deaktivieren' : 'Aktivieren'"
              severity="secondary"
              outlined
              class="min-h-10"
              @click="toggleActive(shift)"
            />
            <PrimeButton label="Löschen" severity="danger" outlined class="min-h-10" @click="openDeleteConfirm(shift)" />
          </div>
        </div>
      </div>
    </div>

    <div class="hidden sm:block">
      <PrimeDataTable :value="dataStore.shifts" striped-rows :loading="dataStore.loadingShifts">
        <PrimeColumn header="" style="width: 40px">
          <template #body="{ data }"><div class="w-4 h-4 rounded-full" :style="{ backgroundColor: data.color }" /></template>
        </PrimeColumn>
        <PrimeColumn field="name" header="Name" sortable>
          <template #body="{ data }"><span :class="{ 'opacity-50': !data.active }">{{ data.name }}</span></template>
        </PrimeColumn>
        <PrimeColumn header="Zeit">
          <template #body="{ data }">{{ data.start_time }} - {{ data.end_time }} Uhr</template>
        </PrimeColumn>
        <PrimeColumn field="min_staff" header="Min. MA" sortable />
        <PrimeColumn field="active" header="Status" sortable>
          <template #body="{ data }"><PrimeTag :value="data.active ? 'Aktiv' : 'Inaktiv'" :severity="data.active ? 'success' : 'danger'" /></template>
        </PrimeColumn>
        <PrimeColumn header="Aktionen" style="width: 180px">
          <template #body="{ data }">
            <div class="flex gap-1">
              <PrimeButton icon="pi pi-pencil" text rounded class="!h-10 !w-10" aria-label="Schicht bearbeiten" @click="openEditDialog(data)" />
              <PrimeButton
                :icon="data.active ? 'pi pi-eye-slash' : 'pi pi-eye'"
                text
                rounded
                class="!h-10 !w-10"
                :aria-label="data.active ? 'Schicht deaktivieren' : 'Schicht aktivieren'"
                @click="toggleActive(data)"
              />
              <PrimeButton icon="pi pi-trash" text rounded class="!h-10 !w-10" severity="danger" aria-label="Schicht löschen" @click="openDeleteConfirm(data)" />
            </div>
          </template>
        </PrimeColumn>
      </PrimeDataTable>
    </div>

    <PrimeDialog
      v-model:visible="showDialog"
      :header="editingShift ? 'Schicht bearbeiten' : 'Schicht anlegen'"
      modal
      :style="{ width: '30rem', maxWidth: 'calc(100vw - 1.5rem)' }"
    >
      <div class="space-y-4">
        <div class="flex flex-col gap-2">
          <label for="shift-name" class="font-medium">Name</label>
          <PrimeInputText id="shift-name" v-model="form.name" placeholder="z. B. Frühschicht" />
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-2">
            <label for="shift-start" class="font-medium">Start</label>
            <PrimeInputText id="shift-start" v-model="form.start_time" type="time" />
          </div>
          <div class="flex flex-col gap-2">
            <label for="shift-end" class="font-medium">Ende</label>
            <PrimeInputText id="shift-end" v-model="form.end_time" type="time" />
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <label class="font-medium">Farbe</label>
          <div class="flex flex-wrap gap-2">
            <button v-for="color in colorOptions" :key="color.value" type="button" class="h-10 w-10 rounded-full border-2 transition-transform hover:scale-110"
              :class="{ 'border-gray-900 dark:border-white scale-110': form.color === color.value, 'border-transparent': form.color !== color.value }"
              :style="{ backgroundColor: color.value }"
              :aria-label="`Farbe ${color.value} auswählen`"
              @click="form.color = color.value"
            />
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <label for="shift-min-staff" class="font-medium">Min. Mitarbeiter</label>
          <PrimeInputNumber v-model="form.min_staff" input-id="shift-min-staff" :min="1" :max="10" show-buttons />
        </div>
      </div>
      <template #footer>
        <PrimeButton label="Abbrechen" text @click="showDialog = false" />
        <PrimeButton :label="editingShift ? 'Speichern' : 'Erstellen'" :loading="saving" @click="saveShift" :disabled="!form.name.trim()" />
      </template>
    </PrimeDialog>

    <PrimeDialog v-model:visible="confirmDelete" header="Schicht löschen" modal :style="{ width: '26rem', maxWidth: 'calc(100vw - 1.5rem)' }">
      <p>{{ shiftToDelete?.name }} wirklich löschen? Bereits bestehende Zuordnungen dieser Schicht gehen dabei verloren.</p>
      <template #footer>
        <PrimeButton label="Abbrechen" text @click="confirmDelete = false" />
        <PrimeButton label="Schicht löschen" severity="danger" class="min-h-11" @click="deleteShift" />
      </template>
    </PrimeDialog>
  </div>
</template>
