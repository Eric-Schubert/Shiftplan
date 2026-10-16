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

async function deactivate() {
  if (!props.staff) return;

  saving.value = true;
  error.value = "";
  try {
    await dataStore.toggleStaffActive(props.staff.staff_id);
    dialogVisible.value = false;
  } catch (cause) {
    error.value = requestError(cause, "settings.saveFailed");
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <PrimeDialog
    v-model:visible="dialogVisible"
    :header="t('settings.staff.deactivate')"
    modal
    :style="{ width: '26rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <p>{{ t("settings.staff.deactivateText", { name: staff?.name ?? "" }) }}</p>

    <small v-if="error" class="mt-3 block text-sm text-[var(--danger-ink)]" role="alert">{{ error }}</small>

    <template #footer>
      <PrimeButton :label="t('common.actions.cancel')" text @click="dialogVisible = false" />
      <PrimeButton :label="t('common.actions.deactivate')" severity="danger" class="min-h-11" :loading="saving" @click="deactivate" />
    </template>
  </PrimeDialog>
</template>
