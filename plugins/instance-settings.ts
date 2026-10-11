// Teams with weekend shifts keep the running week on Saturday and Sunday.
export default defineNuxtPlugin(async () => {
  const appStore = useAppStore();
  const { data } = await useAsyncData("instance", () =>
    $fetch<{ nextWeekFromSaturday?: boolean }>("/api/instance").catch(() => null)
  );

  const enabled = data.value?.nextWeekFromSaturday ?? true;
  // On the client the store already comes with the server's state.
  if (enabled !== appStore.nextWeekFromSaturday) appStore.setNextWeekFromSaturday(enabled);
});
