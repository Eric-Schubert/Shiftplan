import { isAppLocale } from "~/i18n/config";
import type { ClientConfig } from "~/types/instance";

type InstanceResponse = Partial<ClientConfig> & { nextWeekFromSaturday?: boolean; locale?: string };

// Loads the instance settings before the first render: the week start for teams with weekend shifts,
// the mounted config's password policy, shift defaults and CSRF settings, and the instance's language.
export default defineNuxtPlugin({
  name: "instance-settings",
  dependsOn: ["i18n:plugin:route-locale-detect"],
  async setup(nuxtApp) {
    const appStore = useAppStore();
    const { data } = await useAsyncData("instance", () =>
      $fetch<InstanceResponse>("/api/instance").catch(() => null)
    );

    useConfigStore().apply(data.value);
    const enabled = data.value?.nextWeekFromSaturday ?? true;
    // On the client the store already comes with the server's state.
    if (enabled !== appStore.nextWeekFromSaturday) appStore.setNextWeekFromSaturday(enabled);

    // Without a chosen language and without a supported browser language, the instance's language applies.
    // The server decides while rendering; the app keeps the locale it rendered with.
    const i18n = nuxtApp.$i18n;
    const locale = data.value?.locale;
    if (import.meta.server && isAppLocale(locale) && !i18n.getLocaleCookie() && !i18n.getBrowserLocale()) {
      await i18n.setLocale(locale);
    }
  },
});
