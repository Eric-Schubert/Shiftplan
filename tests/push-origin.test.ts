import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { client, closePushClient, currentWeek, stubPushRelay } from "./helpers/push-client";
import { calls, openRelayClient, registerDevices } from "./helpers/push-relay";
import { webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
stubPushRelay();

async function loadOrigin() {
  vi.resetModules();
  return import("../server/services/push/origin");
}

describe("public origin for push", () => {
  afterEach(() => {
    delete process.env.SHIFTPLAN_PUBLIC_URL;
  });

  it("ignores origins push services would reject", async () => {
    const { getHttpsOrigin, rememberOrigin } = await loadOrigin();
    for (const origin of ["https://localhost", "http://plan.example.de", "https://192.168.178.10", "https://[::1]", "nonsense"]) {
      rememberOrigin(origin);
    }
    expect(getHttpsOrigin()).toBeNull();

    rememberOrigin("https://plan.example.de/settings?x=1");
    expect(getHttpsOrigin()).toBe("https://plan.example.de");
  });

  it("prefers the configured public URL over any request origin", async () => {
    process.env.SHIFTPLAN_PUBLIC_URL = "https://plan.example.de/";
    const { getHttpsOrigin, rememberOrigin } = await loadOrigin();
    rememberOrigin("https://evil.example");

    expect(getHttpsOrigin()).toBe("https://plan.example.de");
  });
});

describe("relay registration", () => {
  beforeEach(async () => {
    process.env.SHIFTPLAN_PUBLIC_URL = "https://plan.example.de";
    await openRelayClient();
  });
  afterEach(async () => {
    await closePushClient();
    delete process.env.SHIFTPLAN_PUBLIC_URL;
  });

  it("names the configured URL even when a request claims another origin", async () => {
    await registerDevices();
    const { year, week } = currentWeek();
    const planner = await client.loginAs("planner", "planner1234");
    const assign = await client.request("POST", "/api/shiftplan/assign", {
      jar: planner,
      csrf: true,
      headers: { origin: "https://evil.example" },
      body: { staff_id: 1, shift_id: 1, year, week },
    });
    expect(assign.status).toBe(200);
    await client.push.PushService.flushPendingChanges();

    expect(calls.find((call) => call.url.endsWith("/v1/instances"))?.body).toEqual({
      name: "Schichtplaner",
      url: "https://plan.example.de",
    });
  });
});
