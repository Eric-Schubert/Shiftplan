<script setup lang="ts">
import type { Staff, StaffCreateDTO } from "~/types/staff";

const props = defineProps<{
  visible: boolean;
  staff: Staff | null;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
}>();

const dataStore = useDataStore();
const saving = ref(false);
const form = ref<StaffCreateDTO>(createDefaultForm());

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

const isEditing = computed(() => props.staff !== null);

watch(
  [() => props.visible, () => props.staff],
  ([isVisible, staff]) => {
    if (!isVisible) return;
    form.value = staff ? createEditForm(staff) : createDefaultForm();
  },
  { immediate: true }
);

function createDefaultForm(): StaffCreateDTO {
  return { name: "", active: 1, is_parttime: 0 };
}

function createEditForm(staff: Staff): StaffCreateDTO {
  return {
    name: staff.name,
    active: staff.active,
    is_parttime: staff.is_parttime,
  };
}

async function saveStaff() {
  if (!form.value.name.trim()) return;

  saving.value = true;
  try {
    if (props.staff) {
      await dataStore.updateStaff(props.staff.staff_id, form.value);
    } else {
      await dataStore.createStaff(form.value);
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
    :header="isEditing ? 'Mitarbeiter bearbeiten' : 'Mitarbeiter anlegen'"
    modal
    :style="{ width: '26rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <div class="space-y-4">
      <div class="flex flex-col gap-2">
        <label for="staff-name" class="font-medium">Name</label>
        <PrimeInputText
          id="staff-name"
          v-model="form.name"
          placeholder="Vollständigen Namen eingeben"
        />
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
    </div>

    <template #footer>
      <PrimeButton label="Abbrechen" text @click="dialogVisible = false" />
      <PrimeButton
        :label="isEditing ? 'Speichern' : 'Erstellen'"
        :loading="saving"
        :disabled="!form.name.trim()"
        @click="saveStaff"
      />
    </template>
  </PrimeDialog>
</template>
