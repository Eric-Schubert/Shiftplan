<script setup lang="ts">
const { t } = useI18n();
</script>

<template>
  <footer class="border-t border-[var(--border-soft)]">
    <div class="mx-auto flex max-w-[80rem] items-center justify-center gap-4 px-4 py-5 text-[0.8125rem] text-[var(--text-3)] sm:px-6 lg:px-8">
      <NuxtLink to="/impressum" class="transition hover:text-[var(--text-1)]">
        {{ t("app.layout.imprint") }}
      </NuxtLink>
      <NuxtLink to="/datenschutz" class="transition hover:text-[var(--text-1)]">
        {{ t("app.layout.privacy") }}
      </NuxtLink>
      <LocaleSwitch />
    </div>
  </footer>
</template>
