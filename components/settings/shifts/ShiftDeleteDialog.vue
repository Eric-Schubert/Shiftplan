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
const error = ref("");
const { t } = useI18n();
const requestError = useRequestError();

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});
watch(
  () => props.visible,
  () => (error.value = "")
);

async function deleteShift() {
  if (!props.shift) return;

  deleting.value = true;
  error.value = "";
  try {
    await dataStore.deleteShift(props.shift.shift_id);
    dialogVisible.value = false;
  } catch (cause) {
    error.value = requestError(cause, "settings.saveFailed");
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <PrimeDialog v-model:visible="dialogVisible" :header="t('settings.shifts.delete')" modal :style="{ width: '26rem', maxWidth: 'calc(100vw - 1.5rem)' }">
    <p>{{ t("settings.shifts.deleteText", { name: shift?.name ?? "" }) }}</p>

    <small v-if="error" class="mt-3 block text-sm text-[var(--danger-ink)]" role="alert">{{ error }}</small>

    <template #footer>
      <PrimeButton :label="t('common.actions.cancel')" text @click="dialogVisible = false" />
      <PrimeButton :label="t('settings.shifts.delete')" severity="danger" class="min-h-11" :loading="deleting" @click="deleteShift" />
    </template>
  </PrimeDialog>
</template>
