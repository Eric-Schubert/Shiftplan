import { vi } from "vitest";

/**
 * Stand-in for the web-push package. vi.mock is hoisted per test file, so each file
 * registers it itself: `vi.mock("web-push", () => webPushMock);`
 */
export const sendNotification = vi.fn();

export const webPushMock = {
  default: {
    generateVAPIDKeys: () => ({ publicKey: "test-public-key", privateKey: "test-private-key" }),
    sendNotification: (...args: unknown[]) => sendNotification(...args),
  },
};

/** Keys of a real browser subscription: a P-256 point and a 16-byte secret. */
export const KEYS = {
  p256dh: "BO8gYYxBIGJfQjUtMqXtcXhCAKJc0ld_UoB1Mr7v4vLs1hc80jzC22UYzFpcn8XvPnrASMBzbTv7M_RXDgJmYmY",
  auth: "kaRwQKGgwE9l7EQzI46Bgw",
};
