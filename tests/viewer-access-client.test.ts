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
});
