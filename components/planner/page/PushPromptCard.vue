<script setup lang="ts">
const STORAGE_KEY = "schichtplaner_pushPromptDismissed";

const { state, dialogOpen } = usePushNotifications();
const dismissed = ref(true);

onMounted(() => {
  try {
    dismissed.value = localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    dismissed.value = false;
  }
});

const visible = computed(
  () => !dismissed.value && (state.value === "off" || state.value === "needs-install")
);

function dismiss() {
  dismissed.value = true;
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Private mode: the hint simply comes back next time.
  }
}
</script>

<template>
  <div v-if="visible" class="planner-slab flex items-center gap-3 !py-3">
    <span class="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)]">
      <i class="pi pi-bell" aria-hidden="true"></i>
    </span>
    <p class="min-w-0 flex-1 text-sm text-[var(--text-2)]">
      <span class="font-semibold text-[var(--text-1)]">Bei Planänderungen benachrichtigt werden</span>
      <span class="hidden sm:inline"> – zum Beispiel, wenn jemand ausfällt.</span>
    </p>
    <PrimeButton label="Aktivieren" size="small" class="min-h-9" @click="dialogOpen = true" />
    <PrimeButton
      text
      rounded
      icon="pi pi-times"
      severity="secondary"
      class="!h-9 !w-9"
      aria-label="Hinweis ausblenden"
      title="Nicht mehr anzeigen"
      @click="dismiss"
    />
  </div>
</template>
