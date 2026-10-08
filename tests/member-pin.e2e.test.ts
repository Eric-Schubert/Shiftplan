import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient, type ApiClient, type CookieJar, type Route } from "./helpers/api-harness";

const sendNotification = vi.fn();
vi.mock("web-push", () => ({
  default: {
    generateVAPIDKeys: () => ({ publicKey: "test-public-key", privateKey: "test-private-key" }),
    sendNotification: (...args: unknown[]) => sendNotification(...args),
  },
}));
process.env.SHIFTPLAN_PUSH_RELAY_URL = "off";

const ROUTES: Route[] = [
  ["post", "/api/auth/login", "server/api/auth/login.post"],
  ["post", "/api/staff", "server/api/staff/index.post"],
  ["patch", "/api/staff/:id", "server/api/staff/[id].patch"],
  ["delete", "/api/staff/:id/pin", "server/api/staff/[id]/pin.delete"],
  ["post", "/api/push/subscribe", "server/api/push/subscribe.post"],
  ["post", "/api/member/redeem", "server/api/member/redeem.post"],
  ["post", "/api/member/login", "server/api/member/login.post"],
  ["put", "/api/member/pin", "server/api/member/pin.put"],
  ["get", "/api/member/me", "server/api/member/me.get"],
  ["post", "/api/member/logout", "server/api/member/logout.post"],
  ["post", "/api/member/absences", "server/api/member/absences/index.post"],
  ["post", "/api/member-invites", "server/api/member-invites/index.post"],
  ["get", "/api/member-sessions/pins", "server/api/member-sessions/pins.get"],
  ["get", "/api/viewer/status", "server/api/viewer/status.get"],
];

const ANNA = 1;
const MAX = 2;
const SAME_ORIGIN = { origin: "http://localhost", host: "localhost" };
const KEYS = { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQ", auth: "tBHItJI5svbpez7KI4CCXg" };

let client: ApiClient;

/** A browser that redeems the planner's QR code for a person. */
async function browserWithInvite(staffId: number): Promise<CookieJar> {
  const planner = await client.loginAs("planner", "planner1234");
  const invite = await client.request<{ code: string }>("POST", "/api/member-invites", {
    jar: planner,
    csrf: true,
    body: { staffId },
  });
  const jar: CookieJar = new Map();
  const redeem = await client.request("POST", "/api/member/redeem", {
    jar,
    headers: SAME_ORIGIN,
    body: { code: invite.json!.code, client: "web", deviceName: "Firefox" },
  });
  expect(redeem.status).toBe(200);
  return jar;
}

function pinLogin(shortCode: string, pin: string, extra: Record<string, unknown> = {}, jar?: CookieJar) {
  return client.request<any>("POST", "/api/member/login", {
    jar,
    headers: SAME_ORIGIN,
    body: { shortCode, pin, ...extra },
  });
}

beforeEach(async () => {
  sendNotification.mockReset();
  sendNotification.mockResolvedValue({ statusCode: 201 });
  client = await createApiClient(ROUTES, (db) => {
    db.prepare("INSERT INTO staff (name, short_code) VALUES ('Anna Weber', 'AW')").run();
    db.prepare("INSERT INTO staff (name, short_code) VALUES ('Max Mustermann', 'MM')").run();
    db.prepare(
      "INSERT INTO shifts (name, active, start_time, end_time, color, min_staff, sort_order) VALUES ('Frühschicht', 1, '06:00', '14:00', '#22c55e', 1, 1)"
    ).run();
  });
});

afterEach(() => {
  client.close();
});

describe("sign-in with Kürzel and PIN", () => {
  it("signs a browser in with the QR code, then any device with Kürzel and PIN", async () => {
    const firstBrowser = await browserWithInvite(ANNA);
    expect(firstBrowser.get("member_token")).toMatch(/^[0-9a-f]{64}$/);

    const before = await client.request<any>("GET", "/api/member/me", { jar: firstBrowser });
    const setPin = await client.request("PUT", "/api/member/pin", {
      jar: firstBrowser,
      headers: SAME_ORIGIN,
      body: { pin: "482913" },
    });

    const secondBrowser: CookieJar = new Map();
    const web = await pinLogin("aw", "482913", { client: "web", deviceName: "Büro-PC" }, secondBrowser);
    const app = await pinLogin("AW", "482913", { deviceName: "iPhone" });
    const status = await client.request<any>("GET", "/api/viewer/status", { jar: secondBrowser });

    expect(before.json.staff).toEqual({ id: ANNA, name: "Anna Weber", shortCode: "AW", hasPin: false });
    expect(setPin.status).toBe(200);
    expect(web.status).toBe(200);
    expect(web.json.token).toBeUndefined();
    expect(web.json.staff).toMatchObject({ id: ANNA, shortCode: "AW", hasPin: true });
    expect(secondBrowser.get("member_token")).toMatch(/^[0-9a-f]{64}$/);
    expect(app.json.token).toMatch(/^[0-9a-f]{64}$/);
    expect(status.json.hasAccess).toBe(true);
    expect(client.adminDb.prepare("SELECT pin_hash FROM member_pins").get()).not.toMatchObject({ pin_hash: "482913" });
  });

  it("gives the same answer for wrong PINs and unknown Kürzel and blocks guessing", async () => {
    const browser = await browserWithInvite(ANNA);
    await client.request("PUT", "/api/member/pin", { jar: browser, headers: SAME_ORIGIN, body: { pin: "482913" } });

    const wrong = await pinLogin("AW", "000000");
    const unknown = await pinLogin("ZZ", "482913");
    const withoutPin = await pinLogin("MM", "482913");
    for (let attempt = 0; attempt < 5; attempt += 1) await pinLogin("AW", "111111");
    const blocked = await pinLogin("AW", "482913");

    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(withoutPin.status).toBe(401);
    expect(wrong.json.statusMessage).toBe(unknown.json.statusMessage);
    expect(blocked.status).toBe(429);
  });

  it("rejects short PINs and needs the current PIN to change it", async () => {
    const browser = await browserWithInvite(ANNA);
    const tooShort = await client.request("PUT", "/api/member/pin", { jar: browser, headers: SAME_ORIGIN, body: { pin: "1234" } });
    await client.request("PUT", "/api/member/pin", { jar: browser, headers: SAME_ORIGIN, body: { pin: "482913" } });
    const noCurrent = await client.request("PUT", "/api/member/pin", { jar: browser, headers: SAME_ORIGIN, body: { pin: "777777" } });
    const changed = await client.request("PUT", "/api/member/pin", {
      jar: browser,
      headers: SAME_ORIGIN,
      body: { pin: "777777", currentPin: "482913" },
    });

    expect(tooShort.status).toBe(400);
    expect(noCurrent.status).toBe(403);
    expect(changed.status).toBe(200);
    expect((await pinLogin("AW", "777777")).status).toBe(200);
  });

  it("lets planners see who has a PIN and reset it", async () => {
    const browser = await browserWithInvite(ANNA);
    await client.request("PUT", "/api/member/pin", { jar: browser, headers: SAME_ORIGIN, body: { pin: "482913" } });
    const planner = await client.loginAs("planner", "planner1234");

    const pins = await client.request<any>("GET", "/api/member-sessions/pins", { jar: planner });
    const reset = await client.request("DELETE", "/api/staff/1/pin", { jar: planner, csrf: true });
    const afterReset = await pinLogin("AW", "482913");
    const memberCannotReset = await client.request("DELETE", "/api/staff/1/pin", { jar: browser, headers: SAME_ORIGIN });

    expect(pins.json).toEqual({ staffIds: [ANNA] });
    expect(reset.status).toBe(200);
    expect(afterReset.status).toBe(401);
    expect(memberCannotReset.status).toBe(401);
  });

  it("only accepts cookie writes from the site itself", async () => {
    const browser = await browserWithInvite(ANNA);
    const body = { date: "2099-01-05", reason: "urlaub", notifyTeam: false };

    const foreign = await client.request("POST", "/api/member/absences", {
      jar: browser,
      headers: { origin: "https://evil.example", host: "localhost" },
      body,
    });
    const missing = await client.request("POST", "/api/member/absences", { jar: browser, body });
    const own = await client.request<any>("POST", "/api/member/absences", { jar: browser, headers: SAME_ORIGIN, body });

    expect(foreign.status).toBe(403);
    expect(missing.status).toBe(403);
    expect(own.status).toBe(200);
    expect(own.json.absence.source).toBe("web");
  });

  it("signs the browser out and forgets the cookie", async () => {
    const browser = await browserWithInvite(ANNA);
    const logout = await client.request("POST", "/api/member/logout", { jar: browser, headers: SAME_ORIGIN });
    const me = await client.request("GET", "/api/member/me", { jar: browser });

    expect(logout.status).toBe(200);
    expect(browser.get("member_token") ?? "").toBe("");
    expect(me.status).toBe(401);
  });

  it("sends a signed-in browser the person's own messages, not their own absence notice", async () => {
    const anna = await browserWithInvite(ANNA);
    const max = await browserWithInvite(MAX);
    await client.request("POST", "/api/push/subscribe", {
      jar: anna,
      headers: SAME_ORIGIN,
      body: { endpoint: "https://fcm.googleapis.com/fcm/send/anna", keys: KEYS },
    });
    expect(client.adminDb.prepare("SELECT staff_id FROM push_subscriptions").get()).toEqual({ staff_id: ANNA });

    await client.request("POST", "/api/member/absences", {
      jar: anna,
      headers: SAME_ORIGIN,
      body: { date: "2099-01-05", reason: "urlaub" },
    });
    expect(sendNotification).not.toHaveBeenCalled();

    await client.request("POST", "/api/member/absences", {
      jar: max,
      headers: SAME_ORIGIN,
      body: { date: "2099-01-05", reason: "urlaub" },
    });
    expect(sendNotification).toHaveBeenCalledTimes(1);
  });
});

describe("Kürzel", () => {
  it("suggests one for new staff and refuses duplicates", async () => {
    const admin = await client.loginAs("admin", "admin1234");
    const created = await client.request<any>("POST", "/api/staff", { jar: admin, csrf: true, body: { name: "Mia Müller" } });
    const duplicate = await client.request("PATCH", "/api/staff/1", { jar: admin, csrf: true, body: { short_code: "mm" } });
    const renamed = await client.request<any>("PATCH", "/api/staff/1", { jar: admin, csrf: true, body: { short_code: "a-w 2" } });

    expect(created.json.short_code).toBe("MM2");
    expect(duplicate.status).toBe(409);
    expect(renamed.json.short_code).toBe("AW2");
  });
});
