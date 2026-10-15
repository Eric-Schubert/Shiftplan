import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "~/stores/auth.store";
import { useAuthFetch } from "~/composables/useAuthFetch";

const PLANNER = { userId: 2, username: "planner", role: "planner" as const };
const SIGNED_IN = { authenticated: true, user: PLANNER, csrfToken: "csrf-1" };
const fetchMock = vi.fn();
const router = { currentRoute: { value: { path: "/" } }, push: vi.fn() };

function unauthorized() {
  return Object.assign(new Error("Unauthorized"), { statusCode: 401 });
}

function signedInStore() {
  const store = useAuthStore();
  store.user = PLANNER;
  store.csrfToken = "csrf-1";
  return store;
}

describe("planner session in the browser", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    fetchMock.mockReset();
    router.push.mockReset();
    router.currentRoute.value.path = "/";
    vi.stubGlobal("$fetch", fetchMock);
    vi.stubGlobal("useAuthStore", useAuthStore);
    vi.stubGlobal("useRouter", () => router);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("notices an ended session on a refused write and shows the login", async () => {
    const store = signedInStore();
    fetchMock.mockRejectedValueOnce(unauthorized()).mockResolvedValueOnce({ authenticated: false });

    await expect(useAuthFetch().authFetch("/api/shiftplan/assign", { method: "POST" })).rejects.toThrow();

    expect(store.isAuthenticated).toBe(false);
    expect(store.sessionExpired).toBe(true);
    expect(router.push).toHaveBeenCalledWith("/settings");
  });

  it("keeps the planner signed in when the session is still valid", async () => {
    const store = signedInStore();
    fetchMock.mockRejectedValueOnce(unauthorized()).mockResolvedValueOnce({ ...SIGNED_IN, csrfToken: "csrf-2" });

    await expect(useAuthFetch().authFetch("/api/auth/change-password", { method: "POST" })).rejects.toThrow();

    expect(store.isAuthenticated).toBe(true);
    expect(store.csrfToken).toBe("csrf-2");
    expect(router.push).not.toHaveBeenCalled();
  });

  it("keeps the state when the server cannot be reached", async () => {
    const store = signedInStore();
    fetchMock.mockRejectedValueOnce(new Error("offline"));

    expect(await store.checkSession({ quiet: true })).toBe(true);
    expect(store.user).toEqual(PLANNER);
    expect(store.sessionExpired).toBe(false);
  });

  it("renews the session on activity at most once per interval", async () => {
    const store = signedInStore();
    fetchMock.mockResolvedValue(SIGNED_IN);

    store.extendSession();
    store.extendSession();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/session");
  });

  it("signs out locally even when the request fails, without needing a CSRF token", async () => {
    const store = signedInStore();
    fetchMock.mockRejectedValueOnce(new Error("offline"));

    await store.logout();

    expect(store.user).toBeNull();
    expect(store.csrfToken).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
  });
});
