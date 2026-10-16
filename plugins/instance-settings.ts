import type { ClientConfig } from "~/types/instance";

type InstanceResponse = Partial<ClientConfig> & { nextWeekFromSaturday?: boolean };

// Loads the instance settings before the first render: the week start for teams with weekend shifts
// and the mounted config's password policy, shift defaults and CSRF settings.
export default defineNuxtPlugin(async () => {
  const appStore = useAppStore();
  const { data } = await useAsyncData("instance", () =>
    $fetch<InstanceResponse>("/api/instance").catch(() => null)
  );

  useConfigStore().apply(data.value);
  const enabled = data.value?.nextWeekFromSaturday ?? true;
  // On the client the store already comes with the server's state.
  if (enabled !== appStore.nextWeekFromSaturday) appStore.setNextWeekFromSaturday(enabled);
});
