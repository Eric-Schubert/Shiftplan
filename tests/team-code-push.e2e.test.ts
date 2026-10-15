import { describe, expect, it, vi } from "vitest";
import type { CookieJar } from "./helpers/api-harness";
import {
  ANNA,
  FCM_ENDPOINT,
  SAME_ORIGIN,
  bearer,
  client,
  inviteAndRedeem,
  teamMessage,
  useMemberAccessClient,
} from "./helpers/member-access";
import { KEYS, webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
useMemberAccessClient();

const TEAM_BROWSER = "https://web.push.apple.com/team";
const PLAN = "/api/shiftplan?year=2026&week=41";

async function newCode(admin: CookieJar): Promise<string> {
  const response = await client.request<{ code: string }>("POST", "/api/team-access", {
    jar: admin,
    csrf: true,
    body: { generate: true },
  });
  expect(response.status).toBe(200);
  return response.json!.code;
}

async function annaBrowser() {
  const planner = await client.loginAs("planner", "planner1234");
  const invite = await client.request<{ code: string }>("POST", "/api/member-invites", {
    jar: planner,
    csrf: true,
    body: { staffId: ANNA },
  });
  const web = { jar: new Map() as CookieJar, headers: SAME_ORIGIN };
  await client.request("POST", "/api/member/redeem", { ...web, body: { code: invite.json!.code, client: "web" } });
  const subscribe = await client.request("POST", "/api/push/subscribe", { ...web, body: { endpoint: FCM_ENDPOINT, keys: KEYS } });
  expect(subscribe.status).toBe(200);
}

describe("a new team access code", () => {
  it("drops team-only pushes but keeps personal sign-ins and their pushes", async () => {
    const anna = await inviteAndRedeem(ANNA);
    const device = (token: string, headers: Record<string, string> = {}) =>
      client.request("POST", "/api/push/devices", { headers, body: { platform: "ios", token } });
    expect((await device("anna:APA91b", bearer(anna.token))).status).toBe(200);
    expect((await device("team:APA91b")).status).toBe(200);
    await annaBrowser();
    const team = await client.request("POST", "/api/push/subscribe", { body: { endpoint: TEAM_BROWSER, keys: KEYS } });
    expect(team.status).toBe(200);

    const admin = await client.loginAs("admin", "admin1234");
    const code = await newCode(admin);
    const reached = await teamMessage(await client.loginAs("planner", "planner1234"));

    expect(reached).toEqual({ browsers: [FCM_ENDPOINT], apps: ["anna:APA91b"] });
    expect((await client.request("GET", PLAN, { headers: bearer(anna.token) })).status).toBe(200);

    const viewer = await client.request<{ token: string }>("POST", "/api/viewer/login", { body: { code, client: "app" } });
    expect((await device("viewer:APA91b", bearer(viewer.json!.token))).status).toBe(200);
    await newCode(admin);

    expect((await client.request("GET", PLAN, { headers: bearer(viewer.json!.token) })).status).toBe(401);
    expect(client.adminDb.prepare("SELECT token FROM push_devices").all()).toEqual([{ token: "anna:APA91b" }]);
  });
});
