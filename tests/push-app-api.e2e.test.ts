import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { client, closePushClient, openPushClient, relayFetch, stubPushRelay } from "./helpers/push-client";
import { sendNotification, webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
stubPushRelay();

describe("app api e2e", () => {
  const FCM_TOKEN = "dGVzdC1kZXZpY2U:APA91bH-test_token";

  beforeEach(async () => {
    sendNotification.mockReset();
    relayFetch.mockReset();
    relayFetch.mockRejectedValue(new Error("unexpected network call"));
    await openPushClient();
  });

  afterEach(closePushClient);

  async function enableCode(): Promise<string> {
    const admin = await client.loginAs("admin", "admin1234");
    const created = await client.request<{ code: string }>("POST", "/api/team-access", {
      jar: admin,
      csrf: true,
      body: { generate: true },
    });
    await client.request("POST", "/api/team-access", {
      jar: admin,
      csrf: true,
      body: { instanceName: "Pflegeteam Nord" },
    });
    return created.json!.code;
  }

  async function appLogin(code: string): Promise<Record<string, string>> {
    const login = await client.request<{ token: string; expiresAt: number }>("POST", "/api/viewer/login", {
      body: { code, client: "app" },
    });
    expect(login.status).toBe(200);
    expect(login.headers.some(([name]) => name.toLowerCase() === "set-cookie")).toBe(false);
    return { authorization: `Bearer ${login.json!.token}` };
  }

  it("describes the instance for the app", async () => {
    const before = await client.request("GET", "/api/instance");
    await enableCode();
    const after = await client.request("GET", "/api/instance");

    expect(before.json).toEqual({
      instanceId: expect.stringMatching(/^[A-Za-z0-9_-]{16}$/),
      name: "Schichtplaner",
      version: "9.9.9",
      apiVersion: 1,
      codeRequired: false,
    });
    expect(after.json).toMatchObject({ name: "Pflegeteam Nord", codeRequired: true });
    expect(after.json.instanceId).toBe(before.json.instanceId);
  });

  it("reads the plan with a bearer token and signs out again", async () => {
    const headers = await appLogin(await enableCode());

    const plan = await client.request("GET", "/api/shiftplan?year=2026&week=12", { headers });
    const status = await client.request("GET", "/api/viewer/status", { headers });
    const logout = await client.request("POST", "/api/viewer/logout", { headers });
    const afterLogout = await client.request("GET", "/api/shiftplan?year=2026&week=12", { headers });
    const forged = await client.request("GET", "/api/shiftplan?year=2026&week=12", {
      headers: { authorization: "Bearer not-a-token" },
    });

    expect(plan.status).toBe(200);
    expect(status.json).toMatchObject({ codeRequired: true, hasAccess: true });
    expect(logout.status).toBe(200);
    expect(afterLogout.status).toBe(401);
    expect(forged.status).toBe(401);
  });

  it("registers app devices and removes them with a new code", async () => {
    const headers = await appLogin(await enableCode());
    const devices = () =>
      client.adminDb.prepare("SELECT platform, token, staff_id, scope FROM push_devices").all();

    const anonymous = await client.request("POST", "/api/push/devices", {
      body: { platform: "ios", token: FCM_TOKEN },
    });
    const registered = await client.request("POST", "/api/push/devices", {
      headers,
      body: { platform: "ios", token: FCM_TOKEN },
    });
    const updated = await client.request("POST", "/api/push/devices", {
      headers,
      body: { platform: "ios", token: FCM_TOKEN, staffId: 2, scope: "mine" },
    });

    expect(anonymous.status).toBe(401);
    expect(registered.status).toBe(200);
    expect(updated.status).toBe(200);
    expect(devices()).toEqual([{ platform: "ios", token: FCM_TOKEN, staff_id: 2, scope: "mine" }]);

    const admin = await client.loginAs("admin", "admin1234");
    await client.request("POST", "/api/team-access", { jar: admin, csrf: true, body: { generate: true } });
    expect(devices()).toEqual([]);
  });

  it("rejects invalid device registrations", async () => {
    const invalid = [
      { platform: "windows", token: FCM_TOKEN },
      { platform: "android", token: "has spaces" },
      { platform: "android", token: FCM_TOKEN, scope: "mine" },
      { platform: "android", token: FCM_TOKEN, staffId: 999 },
      { platform: "android", token: FCM_TOKEN, scope: "everything" },
    ];

    for (const body of invalid) {
      const response = await client.request("POST", "/api/push/devices", { body });
      expect(response.status).toBe(400);
    }

    await client.request("POST", "/api/push/devices", { body: { platform: "android", token: FCM_TOKEN } });
    await client.request("DELETE", "/api/push/devices", { body: { token: FCM_TOKEN } });
    expect(client.adminDb.prepare("SELECT COUNT(*) AS count FROM push_devices").get()).toEqual({ count: 0 });
  });
});
