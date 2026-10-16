import { describe, expect, it, vi } from "vitest";
import type { CookieJar } from "./helpers/api-harness";
import { ANNA, SAME_ORIGIN, browserWithInvite, client, pinLogin, useMemberPinClient } from "./helpers/member-pin";
import { webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
useMemberPinClient();

describe("sign-in with short code and PIN", () => {
  it("signs a browser in with the QR code, then any device with short code and PIN", async () => {
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

  it("gives the same answer for wrong PINs and unknown short codes", async () => {
    const browser = await browserWithInvite(ANNA);
    await client.request("PUT", "/api/member/pin", { jar: browser, headers: SAME_ORIGIN, body: { pin: "482913" } });

    const wrong = await pinLogin("AW", "000000");
    const unknown = await pinLogin("ZZ", "482913");
    const withoutPin = await pinLogin("MM", "482913");

    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(withoutPin.status).toBe(401);
    expect(wrong.json.statusMessage).toBe(unknown.json.statusMessage);
  });

  it("blocks guessing from one network for every short code, but not the person elsewhere", async () => {
    const browser = await browserWithInvite(ANNA);
    await client.request("PUT", "/api/member/pin", { jar: browser, headers: SAME_ORIGIN, body: { pin: "482913" } });
    const fromNetwork = (ip: string, shortCode: string, pin: string) =>
      client.request("POST", "/api/member/login", { ip, headers: SAME_ORIGIN, body: { shortCode, pin } });

    for (let attempt = 0; attempt < 5; attempt += 1) await fromNetwork("198.51.100.66", "AW", "111111");

    // The network bucket is full; the short-code bucket allows more failures (member-pin-limits.e2e.test.ts).
    expect((await fromNetwork("198.51.100.66", "MM", "482913")).status).toBe(429);
    expect((await fromNetwork("198.51.100.7", "AW", "482913")).status).toBe(200);
  });

  it("rejects short or trivial PINs and needs the current PIN to change it", async () => {
    const browser = await browserWithInvite(ANNA);
    const setPin = (body: Record<string, string>) => client.request<any>("PUT", "/api/member/pin", { jar: browser, headers: SAME_ORIGIN, body });
    const tooShort = await setPin({ pin: "1234" });
    const trivial = await Promise.all(["000000", "123456", "987654", "121212", "123123"].map((pin) => setPin({ pin })));
    await setPin({ pin: "482913" });
    const noCurrent = await setPin({ pin: "730591" });
    const changed = await setPin({ pin: "730591", currentPin: "482913" });

    expect(tooShort.status).toBe(400);
    expect(trivial.map((response) => response.status)).toEqual([400, 400, 400, 400, 400]);
    expect(trivial[0]!.json.statusMessage).toBe("Diese PIN ist zu leicht zu erraten");
    expect(noCurrent.status).toBe(403);
    expect(changed.status).toBe(200);
    expect((await pinLogin("AW", "730591")).status).toBe(200);
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
});

describe("short code", () => {
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
