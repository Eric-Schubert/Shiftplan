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

  it("keeps an older PIN when a newer device is blocked, and on signing out", async () => {
    const phone = await browserWithInvite(ANNA);
    await setPin(phone, { pin: "582039" });
    const office: CookieJar = new Map();
    await pinLogin("AW", "582039", { client: "web", deviceName: "Büro-PC" }, office);

    expect((await blockDevice("Büro-PC")).status).toBe(200);
    expect((await me(office)).status).toBe(401);
    await client.request("POST", "/api/member/logout", { jar: phone, headers: SAME_ORIGIN });
    expect((await pinLogin("AW", "582039")).status).toBe(200);
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
