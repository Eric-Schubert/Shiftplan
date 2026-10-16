import { isAuthFailure } from "~/stores/auth/session";
import { useConfigStore } from "~/stores/config.store";

export function useAuthFetch() {
  const authStore = useAuthStore();
  const router = useRouter();
  const configStore = useConfigStore();

  /** A refused request may mean the session ended. Then the planner gets the login, not dead controls. */
  async function onAuthFailure(): Promise<void> {
    const stillSignedIn = await authStore.checkSession({ quiet: true });
    if (!stillSignedIn && router.currentRoute.value.path !== "/settings") {
      await router.push("/settings");
    }
  }

  async function authFetch<T = any>(url: string, options: Parameters<typeof $fetch>[1] = {}): Promise<T> {
    const method = String(options.method || "GET").toUpperCase();
    const needsCsrf = configStore.csrf.methods.includes(method);

    const headers: Record<string, string> = {
      ...((options.headers as Record<string, string>) || {}),
    };

    if (needsCsrf && authStore.csrfToken) {
      headers["x-csrf-token"] = authStore.csrfToken;
    }

    try {
      return (await $fetch<T>(url, {
        ...options,
        headers,
      })) as T;
    } catch (error) {
      if (isAuthFailure(error) && authStore.isAuthenticated) await onAuthFailure();
      throw error;
    }
  }

  return { authFetch };
}
