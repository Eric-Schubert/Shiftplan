<script setup lang="ts">
const appStore = useAppStore();
const route = useRoute();

const isSettingsPage = computed(() => route.path === "/settings");
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <!-- Logo & Title -->
          <div class="flex items-center gap-3">
            <Icon name="mdi:calendar-clock" class="text-2xl text-primary-light dark:text-primary-dark" />
            <h1 class="text-xl font-bold text-gray-900 dark:text-white">
              Schichtplaner
            </h1>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2">
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

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <slot />
    </main>
  </div>
</template>
