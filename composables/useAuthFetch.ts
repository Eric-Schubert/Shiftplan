


import backendConfig from "../config/backend.config.json";

export function useAuthFetch() {
  const authStore = useAuthStore();


  async function authFetch<T = any>(
    url: string,
    options: Parameters<typeof $fetch>[1] = {}
  ): Promise<T> {
    const method = String(options.method || "GET").toUpperCase();
    const needsCsrf = backendConfig.auth.routes.csrfMethods.includes(method);

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
