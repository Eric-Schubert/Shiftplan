import { describe, expect, it, vi } from "vitest";
import type { CookieJar } from "./helpers/api-harness";
import { ASSIGNMENT, FOREIGN_ORIGIN, SAME_ORIGIN, client, memberBrowser, setTeamCode, useRoutePolicyClient } from "./helpers/route-policy";
import { webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);

describe("auth middleware against cross-site writes and encoded paths", () => {
  useRoutePolicyClient();

  it("accepts team writes with the team-code or planner cookie only from this site", async () => {
    const code = await setTeamCode();
    const viewer: CookieJar = new Map();
    await client.request("POST", "/api/viewer/login", { jar: viewer, body: { code } });
    const planner = await client.loginAs("planner", "planner1234");

    // No handler is mounted for push/subscribe: 404 means the middleware let the write through.
    const viewerForeign = await client.request("POST", "/api/push/subscribe", { jar: viewer, headers: FOREIGN_ORIGIN, body: {} });
    const plannerForeign = await client.request("POST", "/api/push/subscribe", { jar: planner, headers: FOREIGN_ORIGIN, body: {} });
    const viewerSameSite = await client.request("POST", "/api/push/subscribe", { jar: viewer, headers: SAME_ORIGIN, body: {} });
    const app = await client.request("POST", "/api/push/subscribe", { body: {} });

    expect(viewerForeign.status).toBe(403);
    expect(plannerForeign.status).toBe(403);
    expect(viewerSameSite.status).toBe(404);
    expect(app.status).toBe(404);
  });

  // The router serves the decoded path, so the middleware must classify that one too.
  it("applies every check to percent-encoded /api paths", async () => {
    const member = await memberBrowser();
    await setTeamCode();
    const planner = await client.loginAs("planner", "planner1234");

    for (const prefix of ["/%61pi", "/a%70i", "/%61%70%69"]) {
      expect((await client.request("GET", `${prefix}/absences?year=2030&week=10`)).status).toBe(401);
    }
    const withoutToken = await client.request("POST", "/%61pi/shiftplan/assign", { jar: planner, body: ASSIGNMENT });
    const memberForeign = await client.request("POST", "/%61pi/member/logout", { jar: member, headers: FOREIGN_ORIGIN });

    expect(withoutToken.status).toBe(403);
    expect(memberForeign.status).toBe(403);
  });
});
