export default defineNuxtPlugin(() => {
  const authStore = useAuthStore();


  if (import.meta.client) {
    void authStore.checkSession();
  }
});
