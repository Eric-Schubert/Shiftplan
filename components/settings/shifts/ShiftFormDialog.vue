<script setup lang="ts">
import type { Shift, ShiftCreateDTO } from "~/types/shift";
import backendConfig from "../../../config/backend.config.json";

const props = defineProps<{
  visible: boolean;
  shift: Shift | null;
  nextSortOrder: number;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
}>();

const dataStore = useDataStore();

const defaultColor = backendConfig.validation.shift.defaultColor;

const saving = ref(false);
const form = ref<ShiftCreateDTO>(createDefaultForm(props.nextSortOrder));

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

const isEditing = computed(() => props.shift !== null);

watch(
  [() => props.visible, () => props.shift, () => props.nextSortOrder],
  ([isVisible, shift, nextSortOrder]) => {
    if (!isVisible) return;
    form.value = shift ? createEditForm(shift) : createDefaultForm(nextSortOrder);
  },
  { immediate: true }
);

function createDefaultForm(nextSortOrder: number): ShiftCreateDTO {
  return {
    name: "",
    start_time: "08:00",
    end_time: "16:00",
    color: defaultColor,
    min_staff: backendConfig.validation.shift.minStaff.default,
    sort_order: nextSortOrder,
  };
}

function createEditForm(shift: Shift): ShiftCreateDTO {
  return {
    name: shift.name,
    start_time: shift.start_time,
    end_time: shift.end_time,
    color: shift.color,
    min_staff: shift.min_staff,
    sort_order: shift.sort_order,
  };
}

async function saveShift() {
  if (!form.value.name.trim()) return;

  saving.value = true;
  try {
    if (props.shift) {
      await dataStore.updateShift(props.shift.shift_id, form.value);
    } else {
      await dataStore.createShift(form.value);
    }

    dialogVisible.value = false;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <PrimeDialog
    v-model:visible="dialogVisible"
    :header="isEditing ? 'Schicht bearbeiten' : 'Schicht anlegen'"
    modal
    :style="{ width: '30rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <div class="space-y-4">
      <div class="flex flex-col gap-2">
        <label for="shift-name" class="font-medium">Name</label>
        <PrimeInputText
          id="shift-name"
          v-model="form.name"
          placeholder="z. B. Frühschicht"
        />
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

      <ShiftColorPicker v-model="form.color" />

      <div class="flex flex-col gap-2">
        <label for="shift-min-staff" class="font-medium">Min. Mitarbeiter</label>
        <PrimeInputNumber
          v-model="form.min_staff"
          input-id="shift-min-staff"
          :min="1"
          :max="10"
          show-buttons
        />
      </div>
    </div>

    <template #footer>
      <PrimeButton label="Abbrechen" text @click="dialogVisible = false" />
      <PrimeButton
        :label="isEditing ? 'Speichern' : 'Erstellen'"
        :loading="saving"
        :disabled="!form.name.trim()"
        @click="saveShift"
      />
    </template>
  </PrimeDialog>
</template>
