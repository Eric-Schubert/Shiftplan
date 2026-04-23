export default defineNuxtPlugin(() => {
  const authStore = useAuthStore();

  // Nicht blockieren: Hydration und erster Paint sollen nicht auf /api/auth/session warten.
  if (import.meta.client) {
    void authStore.checkSession();
  }
});
