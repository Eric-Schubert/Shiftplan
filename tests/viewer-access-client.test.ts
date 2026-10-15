import { describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";
import { watchAccessGranted } from "~/composables/useViewerAccess";

describe("access in the browser", () => {
  it("loads the plan once the access code gate opens", async () => {
    const needsAccessCode = ref(true);
    const onGranted = vi.fn();
    watchAccessGranted(needsAccessCode, onGranted);

    needsAccessCode.value = false;
    await nextTick();
    needsAccessCode.value = true;
    await nextTick();

    expect(onGranted).toHaveBeenCalledTimes(1);
  });

  it("keeps a failed load after access was granted from going unhandled", async () => {
    const needsAccessCode = ref(true);
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    watchAccessGranted(needsAccessCode, () => Promise.reject(new Error("offline")));

    needsAccessCode.value = false;
    await nextTick();

    await vi.waitFor(() => expect(logged).toHaveBeenCalledOnce());
    logged.mockRestore();
  });
});
