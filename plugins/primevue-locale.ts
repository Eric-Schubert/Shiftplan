import { buildPrimeLocale } from "~/utils/primevue-locale";

// PrimeVue's date pickers follow the UI locale, also after a switch.
export default defineNuxtPlugin((nuxtApp) => {
  const i18n = nuxtApp.$i18n;
  const primevue = nuxtApp.vueApp.config.globalProperties.$primevue;
  const apply = () => {
    // vue-i18n types tm() of an array poorly; each entry is a message for rt().
    const sizes = i18n.tm("primevue.fileSizeTypes") as unknown as Parameters<typeof i18n.rt>[0][];
    const fileSizeTypes = sizes.map((text) => i18n.rt(text));
    primevue.config.locale = { ...primevue.config.locale, ...buildPrimeLocale(i18n.locale.value, { fileSizeTypes }) };
  };
  apply();
  nuxtApp.hook("i18n:localeSwitched", apply);
});
