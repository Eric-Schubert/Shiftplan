import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  APPLE_ENDPOINT,
  FCM_ENDPOINT,
  client,
  closePushClient,
  currentWeek,
  openPushClient,
  stubPushRelay,
} from "./helpers/push-client";
import { KEYS, sendNotification, webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
stubPushRelay();

describe("team access and push e2e", () => {
  beforeEach(async () => {
    sendNotification.mockReset();
    sendNotification.mockResolvedValue({ statusCode: 201 });
    await openPushClient();
  });

  afterEach(closePushClient);

  it("rejects push endpoints that are not real push services", async () => {
    for (const endpoint of [
      "http://fcm.googleapis.com/fcm/send/x",
      "https://192.168.178.130/internal",
      "https://evil.example/web.push.apple.com",
    ]) {
      const response = await client.request("POST", "/api/push/subscribe", {
        body: { endpoint, keys: KEYS },
      });
      expect(response.status).toBe(400);
    }
    expect(client.push.PushService.countSubscriptions()).toBe(0);
  });

  it("only lets admins manage the code and planners send team messages", async () => {
    const planner = await client.loginAs("planner", "planner1234");
    await client.request("POST", "/api/push/subscribe", { body: { endpoint: FCM_ENDPOINT, keys: KEYS } });
    await client.request("POST", "/api/push/subscribe", { body: { endpoint: APPLE_ENDPOINT, keys: KEYS } });
    sendNotification.mockImplementation(async (subscription: { endpoint: string }) => {
      if (subscription.endpoint === APPLE_ENDPOINT) throw Object.assign(new Error("gone"), { statusCode: 410 });
      return { statusCode: 201 };
    });

    const plannerManage = await client.request("POST", "/api/team-access", {
      jar: planner,
      csrf: true,
      body: { generate: true },
    });
    const anonymousNotify = await client.request("POST", "/api/push/notify", {
      body: { message: "Wer kann Samstag?" },
    });
    const status = await client.request("GET", "/api/push/status", { jar: planner });
    const notify = await client.request("POST", "/api/push/notify", {
      jar: planner,
      csrf: true,
      body: { message: "Wer kann Samstag einspringen?" },
    });

    expect(plannerManage.status).toBe(403);
    expect(anonymousNotify.status).toBe(401);
    expect(status.json).toEqual({ subscriberCount: 2 });
    expect(notify.json).toEqual({ sent: 1, failed: 1 });
    expect(JSON.parse(sendNotification.mock.calls[0]![1])).toEqual({
      title: "Nachricht vom Schichtplaner",
      body: "Wer kann Samstag einspringen?",
      url: "/",
    });
    expect(client.push.PushService.countSubscriptions()).toBe(1);
  });

  it("bundles changes in the current week into one push and ignores later weeks", async () => {
    const planner = await client.loginAs("planner", "planner1234");
    await client.request("POST", "/api/push/subscribe", { body: { endpoint: FCM_ENDPOINT, keys: KEYS } });
    const { year, week } = currentWeek();
    const post = (route: string, staffId: number, targetWeek = week) =>
      client.request("POST", route, {
        jar: planner,
        csrf: true,
        body: { staff_id: staffId, shift_id: 1, year, week: targetWeek },
      });

    await post("/api/shiftplan/assign", 1);
    await client.push.PushService.flushPendingChanges();
    sendNotification.mockClear();

    await post("/api/shiftplan/unassign", 1);
    await post("/api/shiftplan/assign", 2);
    await post("/api/shiftplan/assign", 1, week >= 50 ? 1 : week + 5);
    const result = await client.push.PushService.flushPendingChanges();

    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(sendNotification).toHaveBeenCalledTimes(1);
    expect(JSON.parse(sendNotification.mock.calls[0]![1])).toEqual({
      title: "Schichtplan geändert",
      body: `KW ${week} · Frühschicht: neu: Max / entfällt: Anna`,
      url: `/?year=${year}&week=${week}`,
    });
  });

  it("does not push changes that cancel each other out", async () => {
    const planner = await client.loginAs("planner", "planner1234");
    await client.request("POST", "/api/push/subscribe", { body: { endpoint: FCM_ENDPOINT, keys: KEYS } });
    const { year, week } = currentWeek();
    const body = { staff_id: 1, shift_id: 1, year, week };

    await client.request("POST", "/api/shiftplan/assign", { jar: planner, csrf: true, body });
    await client.request("POST", "/api/shiftplan/unassign", { jar: planner, csrf: true, body });

    expect(await client.push.PushService.flushPendingChanges()).toBeNull();
    expect(sendNotification).not.toHaveBeenCalled();
  });
});
