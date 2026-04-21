<script setup lang="ts">
const appStore = useAppStore();
const authStore = useAuthStore();
const dataStore = useDataStore();
const route = useRoute();
const { openHistory, currentVersion } = useChangelog();

const isSettingsPage = computed(() => route.path === "/settings");
const displayCurrentVersion = computed(() => {
  const version = currentVersion.trim();
  return version.startsWith("v") ? version : `v${version}`;
});

onMounted(() => {
  appStore.initDarkMode();
  dataStore.init();
});
</script>

<template>
  <div class="app-shell min-h-screen">
    <header class="app-header sticky top-0 z-50">
      <div class="mx-auto flex max-w-[86rem] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <NuxtLink to="/" class="group flex min-w-0 items-center gap-3 rounded-2xl">
          <span class="app-logo-mark inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl">
            <Icon name="mdi:calendar-clock" class="text-2xl" />
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
            <Icon name="mdi:shield-check" class="text-sm" />
            <span>{{ authStore.isAdmin ? "Admin" : "Planer" }}</span>
          </div>

          <button
            type="button"
            class="hidden sm:inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text-2)] shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
            @click="openHistory"
            v-tooltip="'Versionsverlauf anzeigen'"
          >
            <Icon name="mdi:history" class="text-base" />
            <span>{{ displayCurrentVersion }}</span>
          </button>
          <PrimeButton
            class="!h-11 !w-11 border !border-[var(--border-soft)] !bg-[var(--surface)] sm:!hidden"
            text
            rounded
            icon="pi pi-info-circle"
            aria-label="Versionsverlauf anzeigen"
            @click="openHistory"
            v-tooltip="'Versionsverlauf anzeigen'"
          />

          <PrimeButton
            text
            rounded
            class="!h-11 !w-11 border !border-[var(--border-soft)] !bg-[var(--surface)]"
            :icon="appStore.isDarkMode ? 'pi pi-sun' : 'pi pi-moon'"
            :aria-label="appStore.isDarkMode ? 'Hellen Modus aktivieren' : 'Dunklen Modus aktivieren'"
            @click="appStore.toggleDarkMode"
            v-tooltip="'Dark Mode'"
          />

          <NuxtLink :to="isSettingsPage ? '/' : '/settings'">
            <PrimeButton
              text
              rounded
              class="!h-11 !w-11 border !border-[var(--border-soft)] !bg-[var(--surface)]"
              :icon="isSettingsPage ? 'pi pi-arrow-left' : 'pi pi-cog'"
              :aria-label="isSettingsPage ? 'Zurück zum Schichtplan' : 'Einstellungen öffnen'"
              v-tooltip="isSettingsPage ? 'Zurück' : 'Einstellungen'"
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
