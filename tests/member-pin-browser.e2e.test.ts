import { describe, expect, it, vi } from "vitest";
import { ANNA, MAX, SAME_ORIGIN, browserWithInvite, client, useMemberPinClient } from "./helpers/member-pin";
import { KEYS, sendNotification, webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
useMemberPinClient();

describe("sign-in with Kürzel and PIN", () => {
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
