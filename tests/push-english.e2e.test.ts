import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APPLE_ENDPOINT, FCM_ENDPOINT, client, closePushClient, currentWeek, stubPushRelay } from "./helpers/push-client";
import { calls, changeShift, openRelayClient } from "./helpers/push-relay";
import { KEYS, sendNotification, webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
stubPushRelay();

describe("push texts in English", () => {
  beforeEach(openRelayClient);
  afterEach(closePushClient);

  it("sends English to devices and subscriptions stored with en, German to the rest", async () => {
    await client.request("POST", "/api/push/devices", { body: { platform: "android", token: "token-de:1" } });
    await client.request("POST", "/api/push/devices", { body: { platform: "ios", token: "token-en:1", locale: "en_GB" } });
    await client.request("POST", "/api/push/subscribe", { body: { endpoint: FCM_ENDPOINT, keys: KEYS } });
    await client.request("POST", "/api/push/subscribe", {
      body: { endpoint: APPLE_ENDPOINT, keys: KEYS },
      headers: { "accept-language": "en-GB,en;q=0.9" },
    });
    const { week } = currentWeek();

    await changeShift("assign", 1);
    await client.push.PushService.flushPendingChanges();
    const sends = calls.filter((call) => call.url.endsWith("/v1/send")).map((call) => [call.body.tokens, call.body.notification]);
    const bodies = sendNotification.mock.calls.map((call) => [call[0].endpoint, JSON.parse(String(call[1]))]);

    expect(sends).toEqual(
      expect.arrayContaining([
        [["token-de:1"], { title: "Schichtplan geändert", body: `KW ${week}: Frühschicht` }],
        [["token-en:1"], { title: "Shift plan changed", body: `Week ${week}: Frühschicht` }],
      ])
    );
    expect(sends).toHaveLength(2);
    expect(Object.fromEntries(bodies)).toMatchObject({
      [FCM_ENDPOINT]: { title: "Schichtplan geändert", body: `KW ${week} · Frühschicht: neu: Anna` },
      [APPLE_ENDPOINT]: { title: "Shift plan changed", body: `Week ${week} · Frühschicht: added: Anna` },
    });
  });
});
