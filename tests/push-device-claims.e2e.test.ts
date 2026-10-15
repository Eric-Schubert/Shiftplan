import { describe, expect, it, vi } from "vitest";
import { ANNA, MAX, bearer, client, inviteAndRedeem, useMemberAccessClient } from "./helpers/member-access";
import { relayCalls } from "./helpers/relay-stub";
import { webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
useMemberAccessClient();

const register = (body: Record<string, unknown>, headers: Record<string, string> = {}) =>
  client.request("POST", "/api/push/devices", { headers, body: { platform: "android", ...body } });

const tokensOf = (staffId: number, personal: boolean) =>
  (
    client.adminDb
      .prepare("SELECT token FROM push_devices WHERE staff_id = ? AND (member_session IS NOT NULL) = ? ORDER BY token")
      .all(staffId, personal ? 1 : 0) as Array<{ token: string }>
  ).map((row) => row.token);

describe("app devices claiming a person", () => {
  it("sends personal messages only to devices signed in as that person", async () => {
    const anna = await inviteAndRedeem(ANNA);
    expect((await register({ token: "anna:APA91b" }, bearer(anna.token))).status).toBe(200);
    // Team mode: anyone with the team link may pick a name for "only mine".
    expect((await register({ token: "impostor:APA91b", staffId: ANNA, scope: "mine" })).status).toBe(200);

    const { PushService } = await import("../server/services/push.service");
    relayCalls.length = 0;
    await PushService.sendToStaff([ANNA], { title: "Tauschanfrage", body: "Arzttermin", url: "/?anfragen=1" });

    const sends = relayCalls.filter((call) => call.url.endsWith("/v1/send"));
    expect(sends.flatMap((call) => call.body.tokens)).toEqual(["anna:APA91b"]);
  });

  it("keeps the ten newest devices per person and team claims never push out personal ones", async () => {
    const anna = await inviteAndRedeem(ANNA);
    for (let index = 0; index < 11; index += 1) {
      expect((await register({ token: `anna-${String(index).padStart(2, "0")}:APA91b` }, bearer(anna.token))).status).toBe(200);
    }
    for (let index = 0; index < 12; index += 1) {
      const claim = await register({ token: `claim-${String(index).padStart(2, "0")}:APA91b`, staffId: ANNA, scope: "mine" });
      expect(claim.status).toBe(200);
    }
    expect((await register({ token: "max:APA91b", staffId: MAX, scope: "mine" })).status).toBe(200);

    const personal = tokensOf(ANNA, true);
    const team = tokensOf(ANNA, false);
    expect(personal).toHaveLength(10);
    expect(personal).not.toContain("anna-00:APA91b");
    expect(personal).toContain("anna-10:APA91b");
    expect(team).toHaveLength(10);
    expect(team).not.toContain("claim-00:APA91b");
    expect(team).not.toContain("claim-01:APA91b");
    expect(tokensOf(MAX, false)).toEqual(["max:APA91b"]);
  });

  it("does not let a full team device table block personal sign-ins", async () => {
    const insert = client.adminDb.prepare("INSERT INTO push_devices (platform, token, scope) VALUES ('android', ?, 'all')");
    client.adminDb.transaction(() => {
      for (let index = 0; index < 5000; index += 1) insert.run(`fake-${index}:APA91b`);
    })();
    const anna = await inviteAndRedeem(ANNA);

    const team = await register({ token: "team:APA91b" });
    const personal = await register({ token: "anna:APA91b" }, bearer(anna.token));

    expect([team.status, personal.status]).toEqual([429, 200]);
  });
});
