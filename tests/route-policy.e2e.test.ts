import { describe, expect, it, vi } from "vitest";
import type { CookieJar } from "./helpers/api-harness";
import { ASSIGNMENT, FOREIGN_ORIGIN, SAME_ORIGIN, client, memberBrowser, setTeamCode, useRoutePolicyClient } from "./helpers/route-policy";
import { webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);

const ABSENCES = "/api/absences?year=2030&week=10";

describe("route policy in the auth middleware", () => {
  useRoutePolicyClient();

  it("lets anyone reach public routes, legal facts and public reads, also with a team code", async () => {
    await setTeamCode();

    expect((await client.request("GET", "/api/auth/session")).status).toBe(200);
    expect((await client.request("GET", "/api/legal/unknown")).status).toBe(404);
    expect((await client.request("GET", "/api/holidays/unknown")).status).toBe(404);
    expect((await client.request("POST", "/api/legal/unknown")).status).toBe(401);
  });

  it("keeps absences readable without a team code and behind it once one is set", async () => {
    expect((await client.request("GET", ABSENCES)).status).toBe(200);

    const member = await memberBrowser();
    const code = await setTeamCode();
    const viewer: CookieJar = new Map();
    await client.request("POST", "/api/viewer/login", { jar: viewer, body: { code } });
    const planner = await client.loginAs("planner", "planner1234");

    expect((await client.request("GET", ABSENCES)).status).toBe(401);
    expect((await client.request("GET", "/api/staff/unknown")).status).toBe(401);
    expect((await client.request("GET", ABSENCES, { jar: viewer })).status).toBe(200);
    expect((await client.request("GET", ABSENCES, { jar: member })).status).toBe(200);
    expect((await client.request("GET", ABSENCES, { jar: planner })).status).toBe(200);
  });

  it("accepts member and team writes with the member cookie only from this site", async () => {
    const member = await memberBrowser();

    const teamForeign = await client.request("POST", "/api/viewer/login", {
      jar: member,
      headers: FOREIGN_ORIGIN,
      body: { code: "WRONGCODE" },
    });
    const memberForeign = await client.request("POST", "/api/member/logout", { jar: member, headers: FOREIGN_ORIGIN });
    const memberSameSite = await client.request("POST", "/api/member/logout", { jar: member, headers: SAME_ORIGIN });

    expect(teamForeign.status).toBe(403);
    expect(memberForeign.status).toBe(403);
    expect(memberSameSite.status).toBe(200);
  });

  it("needs a planner session for everything else, and the CSRF token with a cookie", async () => {
    const anonymous = await client.request("POST", "/api/shiftplan/assign", { body: ASSIGNMENT });
    const planner = await client.loginAs("planner", "planner1234");
    const withoutToken = await client.request("POST", "/api/shiftplan/assign", { jar: planner, body: ASSIGNMENT });
    const withToken = await client.request("POST", "/api/shiftplan/assign", { jar: planner, csrf: true, body: ASSIGNMENT });
    const app = await client.request<{ token: string }>("POST", "/api/auth/login", {
      body: { username: "planner", password: "planner1234", client: "app" },
    });
    const withBearer = await client.request("POST", "/api/shiftplan/assign", {
      headers: { authorization: `Bearer ${app.json!.token}` },
      body: { ...ASSIGNMENT, week: 11 },
    });

    expect(anonymous.status).toBe(401);
    expect(withoutToken.status).toBe(403);
    expect(withToken.status).toBe(200);
    expect(withBearer.status).toBe(200);
  });
});
