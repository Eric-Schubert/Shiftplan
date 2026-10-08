import { describe, expect, it, vi } from "vitest";
import type { CookieJar } from "./helpers/api-harness";
import { ANNA, SAME_ORIGIN, browserWithInvite, client, pinLogin, useMemberPinClient } from "./helpers/member-pin";
import { webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
useMemberPinClient();

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
