<script setup lang="ts">
// Admin switch: does an agreed takeover or swap still need the planner's approval?
const emit = defineEmits<{ (e: "error", message: string): void }>();
const requiresApproval = defineModel<boolean>({ required: true });

const { authFetch } = useAuthFetch();
const saving = ref(false);
const { t } = useI18n();

async function save(value: boolean) {
  saving.value = true;
  emit("error", "");
  try {
    const result = await authFetch<{ requiresApproval: boolean }>("/api/requests/settings", {
      method: "PUT",
      body: { requiresApproval: value },
    });
    requiresApproval.value = result.requiresApproval;
  } catch (cause: any) {
    emit("error", cause?.data?.statusMessage || t("settings.settingFailed"));
    requiresApproval.value = !value;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <label class="flex max-w-[46rem] items-start gap-3 rounded-xl border border-[var(--border-soft)] p-4 text-sm">
    <PrimeCheckbox :model-value="requiresApproval" binary input-id="requests-approval" :disabled="saving" @update:model-value="save" />
    <span>
      <span class="block font-medium text-[var(--text-1)]">{{ t("settings.requests.approval.label") }}</span>
      <span class="text-[var(--text-2)]">{{ t("settings.requests.approval.hint") }}</span>
    </span>
  </label>
</template>
