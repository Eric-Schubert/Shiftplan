<script setup lang="ts">
const showChangelogDialog = useState<boolean>("showChangelogDialog", () => false);

const { t } = useI18n();
// Only lang: no hreflang links without a URL prefix, and the text runs left to right.
const localeHead = useLocaleHead({ dir: false, seo: false });
useHead(() => ({
  htmlAttrs: { lang: localeHead.value.htmlAttrs.lang },
  meta: [{ name: "description", content: t("common.meta.description") }],
}));
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <LazyChangelogBanner v-if="showChangelogDialog" />
</template>
