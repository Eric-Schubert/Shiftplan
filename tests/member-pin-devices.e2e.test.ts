import { describe, expect, it, vi } from "vitest";
import type { CookieJar } from "./helpers/api-harness";
import { ANNA, SAME_ORIGIN, browserWithInvite, client, pinLogin, useMemberPinClient } from "./helpers/member-pin";
import { webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
useMemberPinClient();

describe("PIN and devices", () => {
  const me = (jar: CookieJar) => client.request("GET", "/api/member/me", { jar });
  const setPin = (jar: CookieJar, body: Record<string, string>) => client.request("PUT", "/api/member/pin", { jar, headers: SAME_ORIGIN, body });

  async function blockDevice(deviceName: string) {
    const planner = await client.loginAs("planner", "planner1234");
    const sessions = await client.request<Array<{ sessionId: string; deviceName: string }>>("GET", "/api/member-sessions?staffId=1", { jar: planner });
    const device = sessions.json!.find((session) => session.deviceName === deviceName)!;
    return client.request("DELETE", `/api/member-sessions/${device.sessionId}`, { jar: planner, csrf: true });
  }

  it("drops a PIN set on a blocked device, so its holder cannot sign in again", async () => {
    const lost = await browserWithInvite(ANNA);
    await setPin(lost, { pin: "582039" });

    expect((await blockDevice("Firefox")).status).toBe(200);
    expect((await me(lost)).status).toBe(401);
    expect((await pinLogin("AW", "582039")).status).toBe(401);
  });

  // A leaked QR sign-in sets the PIN, signs in a second device with it and signs the first one out.
  it("drops the PIN on any blocked device, also when the sign-in that chose it is gone", async () => {
    const leaked = await browserWithInvite(ANNA);
    await setPin(leaked, { pin: "582039" });
    const second: CookieJar = new Map();
    await pinLogin("AW", "582039", { client: "web", deviceName: "Büro-PC" }, second);
    await client.request("POST", "/api/member/logout", { jar: leaked, headers: SAME_ORIGIN });

    // Signing out keeps the PIN; blocking the device that is left removes it.
    expect((await pinLogin("AW", "582039")).status).toBe(200);
    expect((await blockDevice("Büro-PC")).status).toBe(200);
    expect((await me(second)).status).toBe(401);
    expect((await pinLogin("AW", "582039")).status).toBe(401);
  });

  it("does not write a PIN whose sign-in a planner reset while it was being saved", async () => {
    const holder = await browserWithInvite(ANNA);
    const planner = await client.loginAs("planner", "planner1234");

    // bcrypt takes long enough for the reset to land between the sign-in check and the write.
    const [write] = await Promise.all([
      setPin(holder, { pin: "582039" }),
      new Promise((resolve) => setTimeout(resolve, 15)).then(() => client.request("DELETE", "/api/staff/1/pin", { jar: planner, csrf: true })),
    ]);

    expect(write.status).toBe(401);
    expect(client.adminDb.prepare("SELECT COUNT(*) AS count FROM member_pins").get()).toEqual({ count: 0 });
    expect((await pinLogin("AW", "582039")).status).toBe(401);
  });

  it("signs the person's other devices out when the PIN changes or is reset", async () => {
    const phone = await browserWithInvite(ANNA);
    await setPin(phone, { pin: "582039" });
    const office: CookieJar = new Map();
    await pinLogin("AW", "582039", { client: "web" }, office);

    expect((await setPin(phone, { pin: "730591", currentPin: "582039" })).status).toBe(200);
    expect((await me(phone)).status).toBe(200);
    expect((await me(office)).status).toBe(401);

    const planner = await client.loginAs("planner", "planner1234");
    expect((await client.request("DELETE", "/api/staff/1/pin", { jar: planner, csrf: true })).status).toBe(200);
    expect((await me(phone)).status).toBe(401);
    expect((await setPin(phone, { pin: "194726" })).status).toBe(401);
  });
});
