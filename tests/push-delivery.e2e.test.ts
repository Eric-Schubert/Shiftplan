import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FCM_ENDPOINT, client, closePushClient, stubPushRelay } from "./helpers/push-client";
import { ALL, calls, changeShift, openRelayClient, registerDevices } from "./helpers/push-relay";
import { KEYS, sendNotification, webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
stubPushRelay();

const subscribe = async () => {
  const response = await client.request("POST", "/api/push/subscribe", { body: { endpoint: FCM_ENDPOINT, keys: KEYS } });
  expect(response.status).toBe(200);
};
const relayTokens = () => calls.filter((call) => call.url.endsWith("/v1/send")).flatMap((call) => call.body.tokens);

describe("bundled plan-change pushes", () => {
  beforeEach(openRelayClient);
  afterEach(async () => {
    vi.useRealTimers();
    await closePushClient();
  });

  it("gives every Web Push send a timeout", async () => {
    await subscribe();
    await changeShift("assign", 1);
    await client.push.PushService.flushPendingChanges();

    expect(sendNotification).toHaveBeenCalledTimes(1);
    expect(sendNotification.mock.calls[0]![2]).toMatchObject({ timeout: 10_000 });
  });

  it("still reaches the apps when Web Push breaks", async () => {
    await registerDevices();
    await subscribe();
    const generateKeys = webPushMock.default.generateVAPIDKeys;
    webPushMock.default.generateVAPIDKeys = () => {
      throw new Error("no VAPID keys");
    };
    try {
      await changeShift("assign", 1);
      const result = await client.push.PushService.flushPendingChanges();

      expect(relayTokens()).toContain(ALL);
      expect(result).toEqual({ sent: 2, failed: 0 });
    } finally {
      webPushMock.default.generateVAPIDKeys = generateKeys;
    }
  });

  it("sends what is still waiting when the server shuts down", async () => {
    await registerDevices();
    Object.assign(globalThis, { defineNitroPlugin: (plugin: unknown) => plugin });
    const plugin = (await import("../server/plugins/push-flush")).default as unknown as (app: unknown) => void;
    const hooks = new Map<string, () => Promise<void>>();
    plugin({ hooks: { hook: (name: string, handler: () => Promise<void>) => hooks.set(name, handler) } });

    await changeShift("assign", 1);
    expect(relayTokens()).toEqual([]);
    await hooks.get("close")!();

    expect(relayTokens()).toContain(ALL);
    expect(client.push.PushService.hasPendingChanges()).toBe(false);
  });

  it("stays silent about corrections of past days", async () => {
    // Thursday of KW 41/2026.
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-08T10:00:00Z") });
    const { PushService } = client.push;
    const dayChange = (date: string) =>
      PushService.queueShiftChange({ year: 2026, week: 41, shiftId: 1, staffId: 1, action: "assign", date });

    dayChange("2026-10-05");
    const pastQueued = PushService.hasPendingChanges();
    dayChange("2026-10-08");

    expect(pastQueued).toBe(false);
    expect(PushService.hasPendingChanges()).toBe(true);
  });
});
