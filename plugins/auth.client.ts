export default defineNuxtPlugin(async () => {
  const authStore = useAuthStore();

  // Session beim App-Start prüfen (nur clientseitig)
  if (import.meta.client) {
    await authStore.checkSession();
  }
});
