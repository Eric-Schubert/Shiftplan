import { describe, expect, it, vi } from "vitest";
import type { CookieJar } from "./helpers/api-harness";
import { ANNA, FCM_ENDPOINT, SAME_ORIGIN, client, teamMessage, useMemberAccessClient } from "./helpers/member-access";
import { KEYS, sendNotification, webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
useMemberAccessClient();

/**
 * The header sign-in and sign-out call usePushNotifications().detect(), which saves the
 * browser's subscription again. This is what the server makes of that.
 */
describe("browser push across a personal sign-in", () => {
  it("binds the subscription on sign-in and keeps team pushes after sign-out", async () => {
    const web = { jar: new Map() as CookieJar, headers: SAME_ORIGIN };
    const resync = () => client.request("POST", "/api/push/subscribe", { ...web, body: { endpoint: FCM_ENDPOINT, keys: KEYS } });
    const { PushService } = await import("../server/services/push.service");
    const personalReach = async () => {
      sendNotification.mockClear();
      await PushService.sendToStaff([ANNA], { title: "Tauschanfrage", body: "Test", url: "/?anfragen=1" });
      return sendNotification.mock.calls.map(([subscription]) => subscription.endpoint);
    };
    expect((await resync()).status).toBe(200);
    expect(await personalReach()).toEqual([]);

    const planner = await client.loginAs("planner", "planner1234");
    const invite = await client.request<{ code: string }>("POST", "/api/member-invites", {
      jar: planner,
      csrf: true,
      body: { staffId: ANNA },
    });
    await client.request("POST", "/api/member/redeem", { ...web, body: { code: invite.json!.code, client: "web" } });
    expect((await resync()).status).toBe(200);
    expect(await personalReach()).toEqual([FCM_ENDPOINT]);

    await client.request("POST", "/api/member/logout", web);
    expect((await teamMessage(planner)).browsers).toEqual([]);
    expect((await resync()).status).toBe(200);

    expect(await personalReach()).toEqual([]);
    expect((await teamMessage(planner)).browsers).toEqual([FCM_ENDPOINT]);
  });
});
