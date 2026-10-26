<script setup lang="ts">
// Imprint and privacy policy. They are also served on the product domain (shiftplan.info), where only
// these pages reach the app, so this layout loads nothing of the planner and "/" is a full page load:
// on an instance that is the plan, on the product domain the product page.
const appStore = useAppStore();
const { t } = useI18n();

onMounted(() => {
  appStore.initDarkMode();
});
</script>

<template>
  <div class="app-shell">
    <a href="#main" class="app-skip-link">{{ t("app.layout.skipToContent") }}</a>
    <header class="app-header sticky top-0 z-50">
      <div class="mx-auto flex h-14 max-w-[80rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a href="/" class="flex min-w-0 items-center gap-2.5 rounded-lg">
          <img src="/favicon.svg" alt="" class="h-8 w-8 flex-shrink-0 rounded-lg" width="32" height="32" />
          <h1 class="truncate text-[0.9375rem] font-semibold text-[var(--text-1)]">Shiftplan</h1>
        </a>

        <button
          type="button"
          class="app-icon-button"
          :aria-label="appStore.isDarkMode ? t('app.layout.theme.light') : t('app.layout.theme.dark')"
          :title="appStore.isDarkMode ? t('app.layout.theme.light') : t('app.layout.theme.dark')"
          @click="appStore.toggleDarkMode"
        >
          <i :class="appStore.isDarkMode ? 'pi pi-sun' : 'pi pi-moon'" class="text-[0.8rem]" aria-hidden="true"></i>
        </button>
      </div>
    </header>

    <main id="main" tabindex="-1" class="app-main mx-auto max-w-[80rem] px-4 pb-12 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <slot />
    </main>

    <AppFooter />
  </div>
</template>
