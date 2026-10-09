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
const saving = ref(false);

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

async function deactivate() {
  if (!props.staff) return;

  saving.value = true;
  try {
    await dataStore.toggleStaffActive(props.staff.staff_id);
    dialogVisible.value = false;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <PrimeDialog
    v-model:visible="dialogVisible"
    header="Mitarbeiter deaktivieren"
    modal
    :style="{ width: '26rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <p>
      {{ staff?.name }} deaktivieren? Das meldet alle Geräte und Browser ab, löscht die PIN und
      zieht offene Anfragen zurück. Nach dem Aktivieren ist ein neuer QR-Code nötig.
    </p>

    <template #footer>
      <PrimeButton label="Abbrechen" text @click="dialogVisible = false" />
      <PrimeButton
        label="Deaktivieren"
        severity="danger"
        class="min-h-11"
        :loading="saving"
        @click="deactivate"
      />
    </template>
  </PrimeDialog>
</template>
