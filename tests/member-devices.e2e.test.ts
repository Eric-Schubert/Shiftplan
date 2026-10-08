import { describe, expect, it, vi } from "vitest";
import { ANNA, EARLY, MAX, THURSDAY, bearer, client, inviteAndRedeem, useMemberAccessClient } from "./helpers/member-access";
import { webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
useMemberAccessClient();

describe("personal app access", () => {
  it("gives read access behind the team code but no planner rights", async () => {
    const { token } = await inviteAndRedeem(ANNA);
    const admin = await client.loginAs("admin", "admin1234");
    await client.request("POST", "/api/team-access", { jar: admin, csrf: true, body: { generate: true } });

    const anonymous = await client.request("GET", "/api/shiftplan?year=2026&week=41");
    const member = await client.request("GET", "/api/shiftplan?year=2026&week=41", { headers: bearer(token) });
    const plannerOnly = await client.request("POST", "/api/absences", {
      headers: bearer(token),
      body: { staffId: MAX, date: THURSDAY, reason: "krank" },
    });
    const invite = await client.request("POST", "/api/member-invites", { headers: bearer(token), body: { staffId: MAX } });
    const assign = await client.request("POST", "/api/shiftplan/assign", {
      headers: bearer(token),
      body: { staff_id: MAX, shift_id: EARLY, year: 2026, week: 41 },
    });

    expect(anonymous.status).toBe(401);
    expect(member.status).toBe(200);
    expect(plannerOnly.status).toBe(401);
    expect(invite.status).toBe(401);
    expect(assign.status).toBe(401);
  });

  it("binds push devices to the person behind the token", async () => {
    const { token } = await inviteAndRedeem(ANNA);

    await client.request("POST", "/api/push/devices", {
      headers: bearer(token),
      body: { platform: "ios", token: "anna-phone:APA91b", staffId: MAX, scope: "mine" },
    });

    expect(client.adminDb.prepare("SELECT staff_id, scope, member_session FROM push_devices").get()).toMatchObject({
      staff_id: ANNA,
      scope: "mine",
      member_session: expect.any(String),
    });
  });

  it("lets planners list and revoke devices, which also removes their push registration", async () => {
    const { token } = await inviteAndRedeem(ANNA);
    await client.request("POST", "/api/push/devices", {
      headers: bearer(token),
      body: { platform: "android", token: "anna-phone:APA91b" },
    });
    const planner = await client.loginAs("planner", "planner1234");

    const list = await client.request<Array<{ sessionId: string; staffName: string; deviceName: string }>>(
      "GET",
      "/api/member-sessions",
      { jar: planner }
    );
    const revoke = await client.request("DELETE", `/api/member-sessions/${list.json![0]!.sessionId}`, {
      jar: planner,
      csrf: true,
    });
    const after = await client.request("GET", "/api/member/me", { headers: bearer(token) });

    expect(list.json).toEqual([expect.objectContaining({ staffName: "Anna Weber", deviceName: "iPhone von Anna" })]);
    expect(revoke.status).toBe(200);
    expect(after.status).toBe(401);
    expect(client.adminDb.prepare("SELECT COUNT(*) AS count FROM push_devices").get()).toEqual({ count: 0 });
  });

  it("signs a device out on its own", async () => {
    const { token } = await inviteAndRedeem(ANNA);
    await client.request("POST", "/api/member/logout", { headers: bearer(token) });
    expect((await client.request("GET", "/api/member/me", { headers: bearer(token) })).status).toBe(401);
  });
});
