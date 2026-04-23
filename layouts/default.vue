<script setup lang="ts">
const appStore = useAppStore();
const authStore = useAuthStore();
const dataStore = useDataStore();
const route = useRoute();
const runtimeConfig = useRuntimeConfig();
const showChangelogDialog = useState<boolean>("showChangelogDialog", () => false);

const isSettingsPage = computed(() => route.path === "/settings");
const currentVersion = String(runtimeConfig.public.appVersion || "").trim();
const displayCurrentVersion = computed(() => {
  const version = currentVersion;
  return version.startsWith("v") ? version : `v${version}`;
});

async function openVersionHistory() {
  showChangelogDialog.value = true;
  const { useChangelog } = await import("~/composables/useChangelog");
  useChangelog().openHistory();
}

watch(
  () => authStore.canEditShifts,
  (canEditShifts) => {
    if (canEditShifts) {
      void dataStore.init();
    }
  },
  { immediate: true }
);

onMounted(() => {
  appStore.initDarkMode();
});
</script>

<template>
  <div class="app-shell min-h-screen">
    <header class="app-header sticky top-0 z-50">
      <div class="mx-auto flex max-w-[86rem] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <NuxtLink to="/" class="group flex min-w-0 items-center gap-3 rounded-2xl">
          <span class="app-logo-mark inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl">
            <i class="pi pi-calendar text-2xl" aria-hidden="true"></i>
          </span>
          <div class="min-w-0">
            <p class="planner-kicker">Teamplanung</p>
            <h1 class="truncate text-lg font-semibold text-[var(--text-1)] sm:text-xl">Schichtplaner</h1>
          </div>
        </NuxtLink>

        <div class="flex items-center gap-2 sm:gap-3">
          <div
            v-if="authStore.isAuthenticated"
            class="planner-chip planner-chip--accent hidden sm:flex"
          >
            <i class="pi pi-shield text-sm" aria-hidden="true"></i>
            <span>{{ authStore.isAdmin ? "Admin" : "Planer" }}</span>
          </div>

          <button
            type="button"
            class="hidden sm:inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text-2)] shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
            title="Versionsverlauf anzeigen"
            @click="openVersionHistory"
          >
            <i class="pi pi-history text-sm" aria-hidden="true"></i>
            <span>{{ displayCurrentVersion }}</span>
          </button>
          <div class="sm:hidden">
            <PrimeButton
              class="!h-11 !w-11 border !border-[var(--border-soft)] !bg-[var(--surface)]"
              text
              rounded
              icon="pi pi-info-circle"
              aria-label="Versionsverlauf anzeigen"
              title="Versionsverlauf anzeigen"
              @click="openVersionHistory"
            />
          </div>

          <PrimeButton
            text
            rounded
            class="!h-11 !w-11 border !border-[var(--border-soft)] !bg-[var(--surface)]"
            :icon="appStore.isDarkMode ? 'pi pi-sun' : 'pi pi-moon'"
            :aria-label="appStore.isDarkMode ? 'Hellen Modus aktivieren' : 'Dunklen Modus aktivieren'"
            :title="appStore.isDarkMode ? 'Hellen Modus aktivieren' : 'Dunklen Modus aktivieren'"
            @click="appStore.toggleDarkMode"
          />

          <NuxtLink :to="isSettingsPage ? '/' : '/settings'" :prefetch="false">
            <PrimeButton
              text
              rounded
              class="!h-11 !w-11 border !border-[var(--border-soft)] !bg-[var(--surface)]"
              :icon="isSettingsPage ? 'pi pi-arrow-left' : 'pi pi-cog'"
              :aria-label="isSettingsPage ? 'Zurueck zum Schichtplan' : 'Einstellungen oeffnen'"
              :title="isSettingsPage ? 'Zurueck zum Schichtplan' : 'Einstellungen oeffnen'"
            />
          </NuxtLink>
        </div>
      </div>
    </header>

    <main class="app-main mx-auto max-w-[86rem] px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <slot />
    </main>
  </div>
</template>
