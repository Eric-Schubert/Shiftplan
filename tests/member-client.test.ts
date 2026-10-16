import { afterEach, describe, expect, it, vi } from "vitest";
import { ref, type Ref } from "vue";
import { useMember } from "~/composables/useMember";

describe("personal sign-in in the browser", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("loads the signed-in member on pages that did not load it", async () => {
    const states = new Map<string, Ref<unknown>>();
    const requestFetch = vi.fn().mockResolvedValue({ staff: { id: 1, name: "Anna", shortCode: "AW", hasPin: true } });
    vi.stubGlobal("useState", (key: string, init: () => unknown) => {
      if (!states.has(key)) states.set(key, ref(init()));
      return states.get(key);
    });
    vi.stubGlobal("useRequestFetch", () => requestFetch);
    vi.stubGlobal("useI18n", () => ({ t: (key: string) => key }));

    const member = useMember();
    await member.ensureLoaded();
    await member.ensureLoaded();

    expect(member.member.value).toMatchObject({ name: "Anna" });
    expect(requestFetch).toHaveBeenCalledTimes(1);
  });
});
