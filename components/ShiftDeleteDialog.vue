<script setup lang="ts">
import type { Shift } from "~/types/shift";

const props = defineProps<{
  visible: boolean;
  shift: Shift | null;
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

async function deleteShift() {
  if (!props.shift) return;

  deleting.value = true;
  try {
    await dataStore.deleteShift(props.shift.shift_id);
    dialogVisible.value = false;
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <PrimeDialog
    v-model:visible="dialogVisible"
    header="Schicht löschen"
    modal
    :style="{ width: '26rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <p>
      {{ shift?.name }} wirklich löschen? Bereits bestehende Zuordnungen dieser Schicht gehen dabei verloren.
    </p>

    <template #footer>
      <PrimeButton label="Abbrechen" text @click="dialogVisible = false" />
      <PrimeButton
        label="Schicht löschen"
        severity="danger"
        class="min-h-11"
        :loading="deleting"
        @click="deleteShift"
      />
    </template>
  </PrimeDialog>
</template>
