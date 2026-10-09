import { describe, expect, it, vi } from "vitest";
import type { CookieJar } from "./helpers/api-harness";
import { ANNA, MAX, SAME_ORIGIN, bearer, client, inviteAndRedeem, useMemberAccessClient } from "./helpers/member-access";
import { relayCalls } from "./helpers/relay-stub";
import { KEYS, sendNotification, webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
useMemberAccessClient();

const ANNA_BROWSER = "https://fcm.googleapis.com/fcm/send/anna";
const STAFF_TABLES = ["member_sessions", "member_pins", "member_invites", "push_devices", "push_subscriptions"];
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Behind a team code: Anna has the app with push, a PIN, a signed-in browser with push and an
 * open QR code. Max has the app with push.
 */
async function annaWithEverything() {
  const admin = await client.loginAs("admin", "admin1234");
  await client.request("POST", "/api/team-access", { jar: admin, csrf: true, body: { generate: true } });
  const anna = await inviteAndRedeem(ANNA);
  const max = await inviteAndRedeem(MAX, "Pixel von Max");
  await client.request("PUT", "/api/member/pin", { headers: bearer(anna.token), body: { pin: "482913" } });
  await client.request("POST", "/api/push/devices", { headers: bearer(anna.token), body: { platform: "ios", token: "anna:APA91b" } });
  await client.request("POST", "/api/push/devices", { headers: bearer(max.token), body: { platform: "android", token: "max:APA91b" } });

  const planner = await client.loginAs("planner", "planner1234");
  const invite = async () =>
    (await client.request<{ code: string }>("POST", "/api/member-invites", { jar: planner, csrf: true, body: { staffId: ANNA } }))
      .json!.code;
  const browser: CookieJar = new Map();
  await client.request("POST", "/api/member/redeem", { jar: browser, headers: SAME_ORIGIN, body: { code: await invite(), client: "web" } });
  await client.request("POST", "/api/push/subscribe", {
    jar: browser,
    headers: SAME_ORIGIN,
    body: { endpoint: ANNA_BROWSER, keys: KEYS },
  });
  await invite();
  return { admin, planner, token: anna.token, browser };
}

/** Who a planner's team message reaches: browser endpoints and app tokens. */
async function teamMessage(planner: CookieJar) {
  sendNotification.mockClear();
  relayCalls.length = 0;
  await client.request("POST", "/api/push/notify", { jar: planner, csrf: true, body: { message: "Wer kann Samstag?" } });
  return {
    browsers: sendNotification.mock.calls.map(([subscription]) => subscription.endpoint),
    apps: relayCalls.filter((call) => call.url.endsWith("/v1/send")).flatMap((call) => call.body.tokens).sort(),
  };
}

function tablesWith(staffId: number): string[] {
  return STAFF_TABLES.filter((table) => client.adminDb.prepare(`SELECT 1 FROM ${table} WHERE staff_id = ?`).get(staffId));
}

const REMOVALS = [
  ["deleted", (admin: CookieJar) => client.request("DELETE", `/api/staff/${ANNA}`, { jar: admin, csrf: true })],
  [
    "deactivated",
    (admin: CookieJar) => client.request("PATCH", `/api/staff/${ANNA}`, { jar: admin, csrf: true, body: { active: false } }),
  ],
] as const;

describe("removing a person", () => {
  for (const [label, remove] of REMOVALS) {
    it(`sends a ${label} person no more pushes and ends their personal access`, async () => {
      const { admin, planner, token, browser } = await annaWithEverything();
      const before = await teamMessage(planner);
      expect(tablesWith(ANNA)).toEqual(STAFF_TABLES);

      expect((await remove(admin)).status).toBe(200);
      const after = await teamMessage(planner);
      const app = await client.request("GET", "/api/member/me", { headers: bearer(token) });
      const web = await client.request("GET", "/api/member/me", { jar: browser });
      const reRegister = await client.request("POST", "/api/push/devices", {
        headers: bearer(token),
        body: { platform: "ios", token: "anna:APA91b" },
      });

      expect(before).toEqual({ browsers: [ANNA_BROWSER], apps: ["anna:APA91b", "max:APA91b"] });
      expect(after).toEqual({ browsers: [], apps: ["max:APA91b"] });
      expect(tablesWith(ANNA)).toEqual([]);
      expect([app.status, web.status, reRegister.status]).toEqual([401, 401, 401]);
    });
  }
});

describe("cleanup of personal access", () => {
  it("drops sessions unused for a year and leftovers of people removed earlier", async () => {
    const now = Date.now();
    const session = client.adminDb.prepare(
      "INSERT INTO member_sessions (session_id, token_hash, staff_id, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)"
    );
    session.run("idle", "hash-idle", ANNA, now - 400 * DAY_MS, now - 366 * DAY_MS);
    session.run("recent", "hash-recent", ANNA, now - 400 * DAY_MS, now - 300 * DAY_MS);
    session.run("inactive", "hash-inactive", 3, now, now);
    const device = client.adminDb.prepare(
      "INSERT INTO push_devices (platform, token, staff_id, scope, member_session) VALUES ('ios', ?, ?, 'all', ?)"
    );
    device.run("idle:APA91b", ANNA, "idle");
    device.run("deleted:APA91b", 99, null);
    client.adminDb.prepare("INSERT INTO member_pins (staff_id, pin_hash, updated_at) VALUES (99, 'hash', 0)").run();
    const planner = await client.loginAs("planner", "planner1234");

    const list = await client.request<Array<{ sessionId: string }>>("GET", "/api/member-sessions", { jar: planner });

    expect(list.json!.map((entry) => entry.sessionId)).toEqual(["recent"]);
    expect(client.adminDb.prepare("SELECT token FROM push_devices").all()).toEqual([]);
    expect([...tablesWith(3), ...tablesWith(99)]).toEqual([]);
  });
});
