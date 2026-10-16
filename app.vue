<script setup lang="ts">
const showChangelogDialog = useState<boolean>("showChangelogDialog", () => false);

// lang is the locale's language tag. useLocaleHead() would warn on every request without a fixed baseUrl,
// which a self-hosted instance does not have, and hreflang links make no sense without URL prefixes.
const { t, locale, locales } = useI18n();
const lang = computed(() => locales.value.find((entry) => entry.code === locale.value)?.language ?? locale.value);
useHead(() => ({
  htmlAttrs: { lang: lang.value },
  meta: [{ name: "description", content: t("common.meta.description") }],
}));
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <LazyChangelogBanner v-if="showChangelogDialog" />
</template>
