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
    client.adminDb.prepare("INSERT INTO push_subscriptions (endpoint, p256dh, auth) VALUES (?, 'AAAA', ?)").run(APPLE_ENDPOINT, KEYS.auth);
    sendNotification.mockImplementation(async (subscription: { keys: { p256dh: string } }) => {
      if (subscription.keys.p256dh === "AAAA") throw new Error("The subscription p256dh value should be 65 bytes long.");
      return { statusCode: 201 };
    });

    const result = await client.push.PushService.sendWebPush({ title: "Test", body: "Test", url: "/" });
    const left = client.adminDb.prepare("SELECT endpoint FROM push_subscriptions").all();

    expect(result).toEqual({ sent: 1, failed: 1 });
    expect(left).toEqual([{ endpoint: FCM_ENDPOINT }]);
  });

  it("drops subscriptions the push service rejects or whose host does not exist", async () => {
    const endpoints = ["400", "403", "413", "500", "ok"].map((name) => `https://fcm.googleapis.com/fcm/send/${name}`);
    const unknownHost = "https://x123.notify.windows.com/w/fake";
    for (const endpoint of [...endpoints, unknownHost]) {
      expect((await client.request("POST", "/api/push/subscribe", { body: { endpoint, keys: KEYS } })).status).toBe(200);
    }
    sendNotification.mockImplementation(async (subscription: { endpoint: string }) => {
      if (subscription.endpoint === unknownHost) throw Object.assign(new Error("getaddrinfo ENOTFOUND"), { code: "ENOTFOUND" });
      const status = Number(subscription.endpoint.split("/").at(-1));
      if (status) throw Object.assign(new Error("push service"), { statusCode: status });
      return { statusCode: 201 };
    });

    await client.push.PushService.sendWebPush({ title: "Test", body: "Test", url: "/" });
    const left = (client.adminDb.prepare("SELECT endpoint FROM push_subscriptions ORDER BY endpoint").all() as Array<{ endpoint: string }>).map((row) =>
      row.endpoint.split("/").at(-1)
    );

    expect(left).toEqual(["413", "500", "ok"]);
  });

  it("gives an unreachable push service three sends before dropping the subscription", async () => {
    await client.request("POST", "/api/push/subscribe", { body: { endpoint: FCM_ENDPOINT, keys: KEYS } });
    sendNotification.mockRejectedValue(Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" }));
    const counts: number[] = [];

    for (let send = 0; send < 3; send += 1) {
      await client.push.PushService.sendWebPush({ title: "Test", body: "Test", url: "/" });
      counts.push(client.push.PushService.countSubscriptions());
    }

    expect(counts).toEqual([1, 1, 0]);
  });

  it("keeps subscriptions with valid keys after a temporary failure", async () => {
    await client.request("POST", "/api/push/subscribe", { body: { endpoint: FCM_ENDPOINT, keys: KEYS } });
    sendNotification.mockRejectedValue(new Error("socket hang up"));

    await client.push.PushService.sendWebPush({ title: "Test", body: "Test", url: "/" });

    expect(client.push.PushService.countSubscriptions()).toBe(1);
  });
});
