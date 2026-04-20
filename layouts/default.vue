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

// Dark Mode und Daten beim Laden initialisieren
onMounted(() => {
  appStore.initDarkMode();
  dataStore.init();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <header class="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <NuxtLink to="/" class="flex items-center gap-3 hover:opacity-80">
            <Icon name="mdi:calendar-clock" class="text-2xl text-primary-light dark:text-primary-dark" />
            <h1 class="text-xl font-bold text-gray-900 dark:text-white">Schichtplaner</h1>
          </NuxtLink>

          <div class="flex items-center gap-2">
            <!-- Rollen-Badge wenn eingeloggt -->
            <div 
              v-if="authStore.isAuthenticated" 
              class="hidden sm:flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-sm"
            >
              <Icon name="mdi:shield-check" class="text-sm" />
              <span>{{ authStore.isAdmin ? "Admin" : "Planer" }}</span>
            </div>

            <button
              type="button"
              class="hidden sm:inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:border-primary-light/50 hover:text-primary-light dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-200 dark:hover:border-primary-dark/50 dark:hover:text-primary-dark"
              @click="openHistory"
              v-tooltip="'Versionsverlauf anzeigen'"
            >
              <Icon name="mdi:history" class="text-base" />
              <span>{{ displayCurrentVersion }}</span>
            </button>
            <PrimeButton
              class="sm:!hidden"
              text
              rounded
              icon="pi pi-info-circle"
              @click="openHistory"
              v-tooltip="'Versionsverlauf anzeigen'"
            />

            <PrimeButton
              text
              rounded
              :icon="appStore.isDarkMode ? 'pi pi-sun' : 'pi pi-moon'"
              @click="appStore.toggleDarkMode"
              v-tooltip="'Dark Mode'"
            />
            
            <NuxtLink :to="isSettingsPage ? '/' : '/settings'">
              <PrimeButton
                text
                rounded
                :icon="isSettingsPage ? 'pi pi-arrow-left' : 'pi pi-cog'"
                v-tooltip="isSettingsPage ? 'Zurück' : 'Einstellungen'"
              />
            </NuxtLink>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <slot />
    </main>
  </div>
</template>
