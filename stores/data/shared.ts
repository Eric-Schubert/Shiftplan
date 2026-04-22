export function getDataStoreCsrfHeaders(): Record<string, string> {
  const authStore = useAuthStore();

  if (authStore.csrfToken) {
    return { "x-csrf-token": authStore.csrfToken };
  }

  return {};
}
