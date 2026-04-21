<script setup lang="ts">
import type { Staff } from "~/types/staff";

const props = defineProps<{
  visible: boolean;
  staff: Staff | null;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
}>();

const dataStore = useDataStore();
const deleting = ref(false);

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

async function deleteStaff() {
  if (!props.staff) return;

  deleting.value = true;
  try {
    await dataStore.deleteStaff(props.staff.staff_id);
    dialogVisible.value = false;
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <PrimeDialog
    v-model:visible="dialogVisible"
    header="Mitarbeiter löschen"
    modal
    :style="{ width: '26rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <p>
      {{ staff?.name }} wirklich löschen? Bereits geplante Einsätze dieses Mitarbeiters gehen dabei verloren.
    </p>

    <template #footer>
      <PrimeButton label="Abbrechen" text @click="dialogVisible = false" />
      <PrimeButton
        label="Mitarbeiter löschen"
        severity="danger"
        class="min-h-11"
        :loading="deleting"
        @click="deleteStaff"
      />
    </template>
  </PrimeDialog>
</template>
