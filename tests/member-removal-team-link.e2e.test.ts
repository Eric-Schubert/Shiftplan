import { describe, expect, it, vi } from "vitest";
import type { CookieJar } from "./helpers/api-harness";
import { ANNA, SAME_ORIGIN, bearer, client, teamMessage, useMemberAccessClient } from "./helpers/member-access";
import { KEYS, webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
useMemberAccessClient();

const ANNA_BROWSER = "https://fcm.googleapis.com/fcm/send/anna";
const PLAN = "/api/shiftplan?year=2026&week=41";

async function deactivateAnna() {
  const admin = await client.loginAs("admin", "admin1234");
  const response = await client.request("PATCH", `/api/staff/${ANNA}`, { jar: admin, csrf: true, body: { active: false } });
  expect(response.status).toBe(200);
}

describe("after removing a person", () => {
  // Documented in docs/self-hosting.md: only a (new) team code locks someone out completely.
  it("keeps read access and team pushes through the team link when no code is set", async () => {
    const planner = await client.loginAs("planner", "planner1234");
    const invite = await client.request<{ code: string }>("POST", "/api/member-invites", {
      jar: planner,
      csrf: true,
      body: { staffId: ANNA },
    });
    const browser: CookieJar = new Map();
    await client.request("POST", "/api/member/redeem", { jar: browser, headers: SAME_ORIGIN, body: { code: invite.json!.code, client: "web" } });
    const subscribe = () =>
      client.request("POST", "/api/push/subscribe", { jar: browser, headers: SAME_ORIGIN, body: { endpoint: ANNA_BROWSER, keys: KEYS } });
    await subscribe();

    await deactivateAnna();
    const afterRemoval = await teamMessage(planner);
    const nextPageLoad = await subscribe();
    const afterPageLoad = await teamMessage(planner);
    const plan = await client.request("GET", PLAN, { jar: browser });

    expect(afterRemoval.browsers).toEqual([]);
    expect(nextPageLoad.status).toBe(200);
    expect(afterPageLoad.browsers).toEqual([ANNA_BROWSER]);
    expect(client.adminDb.prepare("SELECT staff_id, member_session FROM push_subscriptions").all()).toEqual([
      { staff_id: null, member_session: null },
    ]);
    expect(plan.status).toBe(200);
  });

  it("lets no app register in the name of a deactivated person", async () => {
    await deactivateAnna();

    const claim = await client.request("POST", "/api/push/devices", {
      body: { platform: "ios", token: "anna:APA91b", staffId: ANNA, scope: "mine" },
    });
    const team = await client.request("POST", "/api/push/devices", { body: { platform: "android", token: "team:APA91b" } });

    expect([claim.status, team.status]).toEqual([400, 200]);
    expect(client.adminDb.prepare("SELECT token, staff_id FROM push_devices").all()).toEqual([
      { token: "team:APA91b", staff_id: null },
    ]);
  });
});

describe("removing the app", () => {
  it("also ends a team-code token on the instance", async () => {
    const admin = await client.loginAs("admin", "admin1234");
    const created = await client.request<{ code: string }>("POST", "/api/team-access", {
      jar: admin,
      csrf: true,
      body: { generate: true },
    });
    const login = await client.request<{ token: string }>("POST", "/api/viewer/login", {
      body: { code: created.json!.code, client: "app" },
    });
    const headers = bearer(login.json!.token);

    const before = await client.request("GET", PLAN, { headers });
    const logout = await client.request("POST", "/api/member/logout", { headers });
    const after = await client.request("GET", PLAN, { headers });

    expect([before.status, logout.status, after.status]).toEqual([200, 200, 401]);
    expect(client.adminDb.prepare("SELECT COUNT(*) AS count FROM viewer_sessions").get()).toEqual({ count: 0 });
  });
});
