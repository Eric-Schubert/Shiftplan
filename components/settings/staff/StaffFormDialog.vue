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
const error = ref("");
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
    error.value = "";
  },
  { immediate: true }
);

function createDefaultForm(): StaffCreateDTO {
  return { name: "", active: 1, is_parttime: 0, short_code: "" };
}

function createEditForm(staff: Staff): StaffCreateDTO {
  return {
    name: staff.name,
    active: staff.active,
    is_parttime: staff.is_parttime,
    short_code: staff.short_code ?? "",
  };
}

async function saveStaff() {
  if (!form.value.name.trim()) return;

  saving.value = true;
  error.value = "";
  try {
    if (props.staff) {
      await dataStore.updateStaff(props.staff.staff_id, form.value);
    } else {
      await dataStore.createStaff(form.value);
    }

    dialogVisible.value = false;
  } catch (cause: any) {
    error.value = cause?.data?.statusMessage || "Speichern fehlgeschlagen";
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

      <div class="flex flex-col gap-2">
        <label for="staff-short-code" class="font-medium">Kürzel</label>
        <PrimeInputText
          id="staff-short-code"
          v-model="form.short_code"
          maxlength="8"
          class="font-mono uppercase"
          :placeholder="isEditing ? '' : 'Leer lassen für Initialen'"
        />
        <small class="text-xs text-[var(--text-3)]">Zum Anmelden mit PIN, 2 bis 8 Buchstaben oder Ziffern.</small>
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

      <small v-if="error" class="block text-sm text-[var(--danger-ink)]" role="alert">{{ error }}</small>
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
