import { localeTag } from "~/i18n/config";

// <html lang> and the description for every page, the error page included, which renders without app.vue.
// Not useLocaleHead(): it warns on every request without a fixed baseUrl, which a self-hosted instance
// does not have, and hreflang links make no sense without URL prefixes.
export default defineNuxtPlugin({
  name: "locale-head",
  dependsOn: ["i18n:plugin"],
  setup(nuxtApp) {
    const i18n = nuxtApp.$i18n;
    useHead({
      htmlAttrs: { lang: () => localeTag(i18n.locale.value) },
      meta: [{ name: "description", content: () => i18n.t("common.meta.description") }],
    });
  },
});
