import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { client, closePushClient, currentWeek, stubPushRelay } from "./helpers/push-client";
import {
  ALL,
  MINE_ANNA,
  MINE_MAX,
  MINE_OTHER,
  calls,
  changeShift,
  json,
  openRelayClient,
  registerDevices,
  relayResponses,
} from "./helpers/push-relay";
import { webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
stubPushRelay();

describe("push relay e2e", () => {
  beforeEach(openRelayClient);
  afterEach(closePushClient);

  it("sends app pushes without staff names and respects only-mine devices", async () => {
    await registerDevices();
    const { year, week } = currentWeek();
    await changeShift("assign", 1);
    await client.push.PushService.flushPendingChanges();
    calls.length = 0;

    await changeShift("unassign", 1);
    await changeShift("assign", 2);
    const result = await client.push.PushService.flushPendingChanges();
    const instanceId = (await client.request<{ instanceId: string }>("GET", "/api/instance")).json!.instanceId;
    const sends = calls.filter((call) => call.url === "https://relay.test/v1/send");

    expect(calls.map((call) => call.url)).toEqual(["https://relay.test/v1/send", "https://relay.test/v1/send"]);
    expect(sends.every((call) => call.auth === "Bearer inst_test.sk_test")).toBe(true);
    expect(sends.map((call) => call.body)).toEqual([
      {
        tokens: [ALL],
        notification: { title: "Schichtplan geändert", body: `KW ${week}: Frühschicht` },
        data: { instanceId, url: `/?year=${year}&week=${week}`, year: String(year), week: String(week) },
      },
      {
        tokens: [MINE_MAX, MINE_ANNA],
        notification: { title: "Deine Schicht hat sich geändert", body: `KW ${week}: Frühschicht` },
        data: { instanceId, url: `/?year=${year}&week=${week}`, year: String(year), week: String(week) },
      },
    ]);
    expect(JSON.stringify(sends)).not.toMatch(/Anna|Max|Olaf/);
    expect(result).toEqual({ sent: 3, failed: 0 });
  });

  it("registers once with the relay and stores the credentials", async () => {
    await registerDevices();
    await changeShift("assign", 1);
    await client.push.PushService.flushPendingChanges();
    await changeShift("assign", 2);
    await client.push.PushService.flushPendingChanges();

    const registrations = calls.filter((call) => call.url.endsWith("/v1/instances"));
    expect(registrations).toEqual([
      { url: "https://relay.test/v1/instances", auth: undefined, body: { name: "Schichtplaner", url: null } },
    ]);
  });

  it("deletes devices the relay reports as invalid", async () => {
    await registerDevices();
    relayResponses.push(
      () => json(201, { instanceId: "inst_test", secret: "sk_test" }),
      (call) => json(200, { sent: 0, failed: 1, invalidTokens: call.body.tokens })
    );

    const planner = await client.loginAs("planner", "planner1234");
    const notify = await client.request("POST", "/api/push/notify", {
      jar: planner,
      csrf: true,
      body: { message: "Teamtreffen Freitag 14 Uhr" },
    });

    expect(notify.json).toEqual({ sent: 0, failed: 1 });
    expect(calls.at(-1)?.body).toMatchObject({
      tokens: [ALL, MINE_MAX, MINE_ANNA, MINE_OTHER],
      notification: { title: "Nachricht vom Schichtplaner", body: "Teamtreffen Freitag 14 Uhr" },
    });
    expect(client.adminDb.prepare("SELECT COUNT(*) AS count FROM push_devices").get()).toEqual({ count: 0 });
  });
});
