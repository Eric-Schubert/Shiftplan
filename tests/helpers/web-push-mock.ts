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

export const KEYS = { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQ", auth: "tBHItJI5svbpez7KI4CCXg" };
