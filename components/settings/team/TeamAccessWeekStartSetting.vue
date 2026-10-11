<script setup lang="ts">
// Admin switch: does the planner open next week from Saturday on, or keep the running week?
const emit = defineEmits<{ (e: "error", message: string): void }>();
const enabled = defineModel<boolean>({ required: true });

const { authFetch } = useAuthFetch();
const appStore = useAppStore();
const saving = ref(false);

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
    emit("error", cause?.data?.statusMessage || "Die Einstellung konnte nicht gespeichert werden");
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
      <span class="block font-medium text-[var(--text-1)]">Ab Samstag die nächste Woche zeigen</span>
      <span class="text-[var(--text-2)]">
        Passt für Teams ohne Wochenendschichten. Arbeitet ihr am Samstag oder Sonntag, schalte es aus. Dann zeigen
        der Plan und „Heute“ bis Sonntag die laufende Woche.
      </span>
    </span>
  </label>
</template>
