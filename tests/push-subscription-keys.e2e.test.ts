import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APPLE_ENDPOINT, FCM_ENDPOINT, client, closePushClient, openPushClient, stubPushRelay } from "./helpers/push-client";
import { KEYS, sendNotification, webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
stubPushRelay();

const offCurvePoint = Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 1)]).toString("base64url");
const compressedPoint = Buffer.from(KEYS.p256dh, "base64url").subarray(0, 33).toString("base64url");

describe("push subscription keys", () => {
  beforeEach(async () => {
    sendNotification.mockReset();
    sendNotification.mockResolvedValue({ statusCode: 201 });
    await openPushClient();
  });

  afterEach(closePushClient);

  it("stores only keys web-push can encrypt for", async () => {
    for (const keys of [
      { p256dh: "AAAA", auth: KEYS.auth },
      { p256dh: offCurvePoint, auth: KEYS.auth },
      { p256dh: compressedPoint, auth: KEYS.auth },
      { p256dh: KEYS.p256dh, auth: "AAAAAAAAAAA" },
      { p256dh: KEYS.p256dh, auth: "kaRwQKGgwE9l7EQz I46Bgw" },
    ]) {
      const response = await client.request("POST", "/api/push/subscribe", { body: { endpoint: FCM_ENDPOINT, keys } });
      expect(response.status).toBe(400);
    }
    const valid = await client.request("POST", "/api/push/subscribe", { body: { endpoint: FCM_ENDPOINT, keys: KEYS } });

    expect(valid.status).toBe(200);
    expect(client.push.PushService.countSubscriptions()).toBe(1);
  });

  it("drops stored subscriptions whose keys can never work", async () => {
    await client.request("POST", "/api/push/subscribe", { body: { endpoint: FCM_ENDPOINT, keys: KEYS } });
    client.adminDb
      .prepare("INSERT INTO push_subscriptions (endpoint, p256dh, auth) VALUES (?, 'AAAA', ?)")
      .run(APPLE_ENDPOINT, KEYS.auth);
    sendNotification.mockImplementation(async (subscription: { keys: { p256dh: string } }) => {
      if (subscription.keys.p256dh === "AAAA") throw new Error("The subscription p256dh value should be 65 bytes long.");
      return { statusCode: 201 };
    });

    const result = await client.push.PushService.sendWebPush({ title: "Test", body: "Test", url: "/" });
    const left = client.adminDb.prepare("SELECT endpoint FROM push_subscriptions").all();

    expect(result).toEqual({ sent: 1, failed: 1 });
    expect(left).toEqual([{ endpoint: FCM_ENDPOINT }]);
  });

  it("keeps subscriptions with valid keys after a temporary failure", async () => {
    await client.request("POST", "/api/push/subscribe", { body: { endpoint: FCM_ENDPOINT, keys: KEYS } });
    sendNotification.mockRejectedValue(new Error("socket hang up"));

    await client.push.PushService.sendWebPush({ title: "Test", body: "Test", url: "/" });

    expect(client.push.PushService.countSubscriptions()).toBe(1);
  });
});
