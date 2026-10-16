export default defineNuxtPlugin(() => {
  const authStore = useAuthStore();
  // After hydration, so the page hydrates in the checking state the server rendered. An earlier answer
  // made Vue hydrate the sign-in form into the spinner's elements.
  onNuxtReady(() => authStore.checkSession());
});
