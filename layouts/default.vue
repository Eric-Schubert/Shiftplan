<script setup lang="ts">
const appStore = useAppStore();
const authStore = useAuthStore();
const dataStore = useDataStore();
const route = useRoute();
const runtimeConfig = useRuntimeConfig();
const showChangelogDialog = useState<boolean>("showChangelogDialog", () => false);
const { status: viewerStatus } = useViewerAccess();
const { state: pushState, dialogOpen: pushDialogOpen, detect: detectPush } = usePushNotifications();
const showPushButton = computed(() => viewerStatus.value?.hasAccess !== false);

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
  void detectPush();
});
</script>

<template>
  <div class="app-shell">
    <header class="app-header sticky top-0 z-50">
      <div class="mx-auto flex h-14 max-w-[80rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <NuxtLink to="/" class="flex min-w-0 items-center gap-2.5 rounded-lg">
          <span class="app-logo-mark inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg">
            <i class="pi pi-calendar text-sm" aria-hidden="true"></i>
          </span>
          <h1 class="truncate text-[0.9375rem] font-semibold text-[var(--text-1)]">Schichtplaner</h1>
        </NuxtLink>

        <div class="flex items-center gap-1.5 sm:gap-2">
          <span
            v-if="authStore.isAuthenticated"
            class="planner-chip !hidden sm:!inline-flex"
          >
            <i class="pi pi-shield text-[0.7rem]" aria-hidden="true"></i>
            <span>{{ authStore.isAdmin ? "Admin" : "Planer" }}</span>
          </span>

          <button
            type="button"
            class="app-icon-button"
            title="Versionsverlauf anzeigen"
            aria-label="Versionsverlauf anzeigen"
            @click="openVersionHistory"
          >
            <i class="pi pi-history text-[0.8rem]" aria-hidden="true"></i>
            <span class="hidden tabular-nums sm:inline">{{ displayCurrentVersion }}</span>
          </button>

          <button
            v-if="showPushButton"
            type="button"
            class="app-icon-button"
            :class="{ 'text-[var(--accent-strong)]': pushState === 'on' }"
            :aria-label="pushState === 'on' ? 'Benachrichtigungen aktiv' : 'Benachrichtigungen einrichten'"
            :title="pushState === 'on' ? 'Benachrichtigungen aktiv' : 'Benachrichtigungen einrichten'"
            @click="pushDialogOpen = true"
          >
            <i :class="pushState === 'on' ? 'pi pi-bell' : 'pi pi-bell-slash'" class="text-[0.8rem]" aria-hidden="true"></i>
          </button>

          <button
            type="button"
            class="app-icon-button"
            :aria-label="appStore.isDarkMode ? 'Hellen Modus aktivieren' : 'Dunklen Modus aktivieren'"
            :title="appStore.isDarkMode ? 'Hellen Modus aktivieren' : 'Dunklen Modus aktivieren'"
            @click="appStore.toggleDarkMode"
          >
            <i :class="appStore.isDarkMode ? 'pi pi-sun' : 'pi pi-moon'" class="text-[0.8rem]" aria-hidden="true"></i>
          </button>

          <NuxtLink
            :to="isSettingsPage ? '/' : '/settings'"
            :prefetch="false"
            class="app-icon-button"
            :aria-label="isSettingsPage ? 'Zurück zum Schichtplan' : 'Einstellungen öffnen'"
            :title="isSettingsPage ? 'Zurück zum Schichtplan' : 'Einstellungen öffnen'"
          >
            <i :class="isSettingsPage ? 'pi pi-arrow-left' : 'pi pi-cog'" class="text-[0.8rem]" aria-hidden="true"></i>
          </NuxtLink>
        </div>
      </div>
    </header>

    <main class="app-main mx-auto max-w-[80rem] px-4 pb-12 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <slot />
    </main>

    <footer class="border-t border-[var(--border-soft)]">
      <div class="mx-auto flex max-w-[80rem] items-center justify-center gap-4 px-4 py-5 text-[0.8125rem] text-[var(--text-3)] sm:px-6 lg:px-8">
        <NuxtLink to="/impressum" class="transition hover:text-[var(--text-1)]">
          Impressum
        </NuxtLink>
        <NuxtLink to="/datenschutz" class="transition hover:text-[var(--text-1)]">
          Datenschutz
        </NuxtLink>
      </div>
    </footer>

    <LazyPushDialog v-if="pushDialogOpen" />
  </div>
</template>
