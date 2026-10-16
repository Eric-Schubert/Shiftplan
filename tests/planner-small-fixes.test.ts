import { afterEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { useSwipe } from "~/composables/useSwipe";
import { staffingGap } from "~/composables/useRotationPatternSummary";
import { subscribedWithKey } from "~/utils/push-subscription";
import { entrySeparator } from "~/utils/audit-entry";

type Touch = { clientX: number; clientY: number };

function swipeArea() {
  const handlers = new Map<string, (event: unknown) => void>();
  const element = { addEventListener: (type: string, handler: (event: unknown) => void) => handlers.set(type, handler), removeEventListener: () => {} };
  const fire = (type: string, touches: Touch[], changed: Touch[] = touches) => handlers.get(type)!({ touches, changedTouches: changed });
  return { element: element as unknown as HTMLElement, fire };
}

describe("week swipe", () => {
  afterEach(() => vi.restoreAllMocks());

  it("changes the week on a one-finger swipe but not on a pinch", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { element, fire } = swipeArea();
    const onSwipeLeft = vi.fn();
    useSwipe(ref(element), { onSwipeLeft });

    fire("touchstart", [{ clientX: 200, clientY: 100 }]);
    fire("touchstart", [
      { clientX: 200, clientY: 100 },
      { clientX: 260, clientY: 100 },
    ]);
    fire("touchend", [{ clientX: 120, clientY: 100 }], [{ clientX: 120, clientY: 100 }]);
    fire("touchend", [], [{ clientX: 330, clientY: 100 }]);
    expect(onSwipeLeft).not.toHaveBeenCalled();

    fire("touchstart", [{ clientX: 200, clientY: 100 }]);
    fire("touchend", [], [{ clientX: 120, clientY: 100 }]);
    expect(onSwipeLeft).toHaveBeenCalledOnce();
  });
});

describe("rotation review", () => {
  it("flags a shift only when it has fewer people than its minimum", () => {
    expect(staffingGap(0, 0)).toBeNull();
    expect(staffingGap(0, 2)).toBe("unstaffed");
    expect(staffingGap(1, 2)).toBe("short");
    expect(staffingGap(2, 2)).toBeNull();
  });
});

describe("browser push", () => {
  it("knows a subscription made with an older server key", () => {
    const key = "BAAB";
    expect(subscribedWithKey(new Uint8Array([4, 0, 1]).buffer, key)).toBe(true);
    expect(subscribedWithKey(new Uint8Array([4, 0, 2]).buffer, key)).toBe(false);
    expect(subscribedWithKey(null, key)).toBe(true);
  });
});

describe("audit entry", () => {
  it("leaves no dangling separator when an absence names no shift", () => {
    expect(entrySeparator(" fällt aus · ", false)).toBe(" fällt aus");
    expect(entrySeparator(" absent · ", false)).toBe(" absent");
    expect(entrySeparator(" absent · ", true)).toBe(" absent · ");
  });
});
