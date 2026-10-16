import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useDataStore } from "~/stores/data.store";

describe("planner data", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal("useAuthStore", () => ({ csrfToken: "token" }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("keeps a failed first load as an error the layout can retry, without throwing", async () => {
    vi.stubGlobal("$fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const store = useDataStore();
    await expect(store.init()).resolves.toBe(false);
    expect(store.loadError).toBe(true);

    vi.stubGlobal("$fetch", vi.fn().mockResolvedValue([]));
    await expect(store.init()).resolves.toBe(true);
    expect(store.loadError).toBe(false);
  });
});
