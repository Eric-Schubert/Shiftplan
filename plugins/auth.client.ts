export default defineNuxtPlugin(() => {
  const authStore = useAuthStore();
  void authStore.checkSession();
});
