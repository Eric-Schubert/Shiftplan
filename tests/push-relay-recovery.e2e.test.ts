import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FCM_ENDPOINT, client, closePushClient, stubPushRelay } from "./helpers/push-client";
import { calls, changeShift, json, openRelayClient, registerDevices, relayResponses } from "./helpers/push-relay";
import { KEYS, sendNotification, webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
stubPushRelay();

describe("push relay e2e", () => {
  beforeEach(openRelayClient);
  afterEach(closePushClient);

  it("registers again when the relay forgot the instance", async () => {
    await registerDevices();
    await changeShift("assign", 1);
    await client.push.PushService.flushPendingChanges();
    relayResponses.push(
      () => json(401, { error: "Unauthorized" }),
      () => json(201, { instanceId: "inst_new", secret: "sk_new" })
    );

    calls.length = 0;
    await changeShift("assign", 2);
    const result = await client.push.PushService.flushPendingChanges();

    expect(calls.map((call) => [call.url, call.auth])).toEqual([
      ["https://relay.test/v1/send", "Bearer inst_test.sk_test"],
      ["https://relay.test/v1/instances", undefined],
      ["https://relay.test/v1/send", "Bearer inst_new.sk_new"],
      ["https://relay.test/v1/send", "Bearer inst_new.sk_new"],
    ]);
    expect(result?.failed).toBe(0);
  });

  it("keeps web pushes working when the relay is down", async () => {
    await registerDevices();
    await client.request("POST", "/api/push/subscribe", { body: { endpoint: FCM_ENDPOINT, keys: KEYS } });
    relayResponses.push(() => json(503, { error: "down" }));

    await changeShift("assign", 1);
    const result = await client.push.PushService.flushPendingChanges();

    expect(sendNotification).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ sent: 1, failed: 2 });
  });

  it("does not contact any relay when app pushes are switched off", async () => {
    process.env.SHIFTPLAN_PUSH_RELAY_URL = "off";
    try {
      await registerDevices();
      await changeShift("assign", 1);
      await client.push.PushService.flushPendingChanges();
      expect(calls).toEqual([]);
    } finally {
      process.env.SHIFTPLAN_PUSH_RELAY_URL = "https://relay.test";
    }
  });
});
