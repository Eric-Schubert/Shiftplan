/**
 * Composable für authentifizierte API-Aufrufe
 *
 * Fügt automatisch den CSRF-Token als Header zu allen
 * state-ändernden Requests (POST, PATCH, PUT, DELETE) hinzu.
 *
 * Verwendung:
 *   const { authFetch } = useAuthFetch();
 *   await authFetch('/api/staff', { method: 'POST', body: data });
 */
export function useAuthFetch() {
  const authStore = useAuthStore();

  /**
   * Wrapper um $fetch der automatisch CSRF-Header setzt
   */
  async function authFetch<T = any>(
    url: string,
    options: Parameters<typeof $fetch>[1] = {}
  ): Promise<T> {
    const method = String(options.method || "GET").toUpperCase();
    const needsCsrf = ["POST", "PATCH", "PUT", "DELETE"].includes(method);

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    if (needsCsrf && authStore.csrfToken) {
      headers["x-csrf-token"] = authStore.csrfToken;
    }

    return (await $fetch<T>(url, {
      ...options,
      headers,
    })) as T;
  }

  return { authFetch };
}
