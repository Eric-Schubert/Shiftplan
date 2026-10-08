import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import backendConfig from "../config/backend.config.json";
import type { CookieJar } from "./helpers/api-harness";
import { APPLE_ENDPOINT, FCM_ENDPOINT, client, closePushClient, openPushClient, stubPushRelay } from "./helpers/push-client";
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

  it("keeps the plan public and allows push subscriptions while no code is set", async () => {
    const status = await client.request("GET", "/api/viewer/status");
    const plan = await client.request("GET", "/api/shiftplan?year=2026&week=12");
    const subscribe = await client.request("POST", "/api/push/subscribe", {
      body: { endpoint: FCM_ENDPOINT, keys: KEYS },
    });

    expect(status.json).toEqual({
      codeRequired: false,
      hasAccess: true,
      pushPublicKey: "test-public-key",
    });
    expect(plan.status).toBe(200);
    expect(subscribe.status).toBe(200);
    expect(client.push.PushService.countSubscriptions()).toBe(1);
  });

  it("protects the plan behind the access code and lets employees in with it", async () => {
    const admin = await client.loginAs("admin", "admin1234");
    const created = await client.request<{ code: string }>("POST", "/api/team-access", {
      jar: admin,
      csrf: true,
      body: { generate: true },
    });
    const code = created.json!.code;

    const anonymousPlan = await client.request("GET", "/api/shiftplan?year=2026&week=12");
    const anonymousStatus = await client.request("GET", "/api/viewer/status");
    const anonymousSubscribe = await client.request("POST", "/api/push/subscribe", {
      body: { endpoint: FCM_ENDPOINT, keys: KEYS },
    });
    const wrongCode = await client.request("POST", "/api/viewer/login", {
      body: { code: "WRONGCODE" },
    });

    const viewer: CookieJar = new Map();
    const login = await client.request("POST", "/api/viewer/login", {
      jar: viewer,
      body: { code: ` ${code.toLowerCase()} ` },
    });
    const viewerPlan = await client.request("GET", "/api/shiftplan?year=2026&week=12", { jar: viewer });
    const viewerAssign = await client.request("POST", "/api/shiftplan/assign", {
      jar: viewer,
      body: { staff_id: 1, shift_id: 1, year: 2026, week: 12 },
    });
    const plannerPlan = await client.request("GET", "/api/shiftplan?year=2026&week=12", {
      jar: await client.loginAs("planner", "planner1234"),
    });

    expect(code).toMatch(/^[A-Z2-9]{8}$/);
    expect(anonymousPlan.status).toBe(401);
    expect(anonymousStatus.json).toEqual({ codeRequired: true, hasAccess: false, pushPublicKey: null });
    expect(anonymousSubscribe.status).toBe(401);
    expect(wrongCode.status).toBe(401);
    expect(login.status).toBe(200);
    expect(viewer.get("viewer_token")).toBeTruthy();
    expect(viewerPlan.status).toBe(200);
    expect(viewerAssign.status).toBe(401);
    expect(plannerPlan.status).toBe(200);
  });

  it("keeps planner logins open after mistyped team codes from the same network", async () => {
    const admin = await client.loginAs("admin", "admin1234");
    await client.request("POST", "/api/team-access", { jar: admin, csrf: true, body: { generate: true } });

    for (let attempt = 0; attempt < backendConfig.auth.loginRateLimit.maxAttempts; attempt += 1) {
      await client.request("POST", "/api/viewer/login", { body: { code: "WRONGCODE" } });
    }
    const blockedViewer = await client.request("POST", "/api/viewer/login", { body: { code: "WRONGCODE" } });

    expect(blockedViewer.status).toBe(429);
    await client.loginAs("planner", "planner1234");
  });

  it("signs out employee devices and drops subscriptions when the code changes", async () => {
    const admin = await client.loginAs("admin", "admin1234");
    await client.request("POST", "/api/team-access", { jar: admin, csrf: true, body: { code: "Team-2026" } });

    const viewer: CookieJar = new Map();
    await client.request("POST", "/api/viewer/login", { jar: viewer, body: { code: "team-2026" } });
    await client.request("POST", "/api/push/subscribe", {
      jar: viewer,
      body: { endpoint: APPLE_ENDPOINT, keys: KEYS },
    });
    expect(client.push.PushService.countSubscriptions()).toBe(1);

    await client.request("POST", "/api/team-access", { jar: admin, csrf: true, body: { code: "Neu-2026" } });
    const afterRotation = await client.request("GET", "/api/shiftplan?year=2026&week=12", { jar: viewer });

    expect(afterRotation.status).toBe(401);
    expect(client.push.PushService.countSubscriptions()).toBe(0);

    const removed = await client.request("POST", "/api/team-access", { jar: admin, csrf: true, body: { code: null } });
    const publicAgain = await client.request("GET", "/api/shiftplan?year=2026&week=12");
    expect(removed.json).toEqual({ code: null });
    expect(publicAgain.status).toBe(200);
  });
});
