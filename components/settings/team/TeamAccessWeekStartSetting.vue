<script setup lang="ts">
// Admin switch: does the planner open next week from Saturday on, or keep the running week?
const emit = defineEmits<{ (e: "error", message: string): void }>();
const enabled = defineModel<boolean>({ required: true });

const { authFetch } = useAuthFetch();
const appStore = useAppStore();
const saving = ref(false);
const { t } = useI18n();

async function save(value: boolean) {
  saving.value = true;
  emit("error", "");
  try {
    const result = await authFetch<{ nextWeekFromSaturday: boolean }>("/api/team-access", {
      method: "POST",
      body: { nextWeekFromSaturday: value },
    });
    enabled.value = result.nextWeekFromSaturday;
    appStore.setNextWeekFromSaturday(result.nextWeekFromSaturday);
  } catch (cause: any) {
    emit("error", cause?.data?.statusMessage || t("settings.settingFailed"));
    enabled.value = !value;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <label class="flex max-w-[46rem] items-start gap-3 rounded-xl border border-[var(--border-soft)] p-4 text-sm">
    <PrimeCheckbox
      :model-value="enabled"
      binary
      input-id="team-next-week-from-saturday"
      :disabled="saving"
      @update:model-value="save"
    />
    <span>
      <span class="block font-medium text-[var(--text-1)]">{{ t("settings.team.weekStart.label") }}</span>
      <span class="text-[var(--text-2)]">{{ t("settings.team.weekStart.hint") }}</span>
    </span>
  </label>
</template>
