import { describe, expect, it, vi } from "vitest";
import { confirmedPushState, type SubscriptionSync } from "~/utils/push-subscription";

// Keys as the browser hands them out: the subscription's key as bytes, the server's as URL-safe base64.
const CURRENT_KEY = "BAAB";
const CURRENT_BYTES = new Uint8Array([4, 0, 1]).buffer;
const OLD_BYTES = new Uint8Array([4, 0, 2]).buffer;

function subscription(applicationServerKey: ArrayBuffer | null) {
  return { options: { applicationServerKey }, unsubscribe: vi.fn(async () => true) } as unknown as PushSubscription;
}

function sync(overrides: Partial<SubscriptionSync> = {}) {
  const renewed = subscription(CURRENT_BYTES);
  const save = vi.fn(async () => {});
  const renew = vi.fn(async () => renewed);
  return {
    save,
    renew,
    renewed,
    run: () => confirmedPushState({ subscription: subscription(CURRENT_BYTES), publicKey: CURRENT_KEY, hasAccess: true, save, renew, ...overrides }),
  };
}

describe("browser push state", () => {
  it("is on only once the server confirmed the subscription", async () => {
    const confirmed = sync();
    await expect(confirmed.run()).resolves.toBe("on");
    expect(confirmed.save).toHaveBeenCalledOnce();
    expect(confirmed.renew).not.toHaveBeenCalled();

    const refused = sync({ save: vi.fn(async () => Promise.reject(new Error("429"))) });
    await expect(refused.run()).resolves.toBe("failed");
  });

  it("replaces a subscription made with an older server key once", async () => {
    const old = subscription(OLD_BYTES);
    const renewal = sync({ subscription: old });
    await expect(renewal.run()).resolves.toBe("on");
    expect(old.unsubscribe).toHaveBeenCalledOnce();
    expect(renewal.renew).toHaveBeenCalledWith(CURRENT_KEY);
    expect(renewal.save).toHaveBeenCalledWith(renewal.renewed);

    const failing = sync({ subscription: subscription(OLD_BYTES), renew: vi.fn(async () => Promise.reject(new Error("blocked"))) });
    await expect(failing.run()).resolves.toBe("failed");
    expect(failing.save).not.toHaveBeenCalled();
  });

  it("is off without a subscription and unknown while the team code gate is closed", async () => {
    await expect(sync({ subscription: null }).run()).resolves.toBe("off");

    const gated = sync({ hasAccess: false });
    await expect(gated.run()).resolves.toBe("loading");
    expect(gated.save).not.toHaveBeenCalled();
  });
});
