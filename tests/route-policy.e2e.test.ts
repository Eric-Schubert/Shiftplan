import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { routeFromApiFile } from "../scripts/docs/routes.js";
import { createApiClient, type ApiClient, type CookieJar, type Route } from "./helpers/api-harness";
import { webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);

// One case per class in server/config/route-policy.ts, through the real auth middleware.
// Paths without a handler answer 404 once the middleware lets them through.
const ROUTES: Route[] = [
  "server/api/auth/login.post.ts",
  "server/api/auth/session.get.ts",
  "server/api/absences/index.get.ts",
  "server/api/team-access/index.post.ts",
  "server/api/viewer/login.post.ts",
  "server/api/member-invites/index.post.ts",
  "server/api/member/redeem.post.ts",
  "server/api/member/logout.post.ts",
  "server/api/shiftplan/assign.post.ts",
].map((file) => {
  const { method, route } = routeFromApiFile(file);
  return [method.toLowerCase(), route, file.replace(/\.ts$/, "")];
});

const SAME_ORIGIN = { origin: "http://localhost", host: "localhost" };
const FOREIGN_ORIGIN = { origin: "https://evil.example", host: "localhost" };
const ASSIGNMENT = { staff_id: 1, shift_id: 1, year: 2030, week: 10 };
const ABSENCES = "/api/absences?year=2030&week=10";

let client: ApiClient;

async function setTeamCode(): Promise<string> {
  const admin = await client.loginAs("admin", "admin1234");
  const created = await client.request<{ code: string }>("POST", "/api/team-access", {
    jar: admin,
    csrf: true,
    body: { generate: true },
  });
  return created.json!.code;
}

/** A browser that redeemed a personal invite for Anna: signed in with the member cookie. */
async function memberBrowser(): Promise<CookieJar> {
  const planner = await client.loginAs("planner", "planner1234");
  const invite = await client.request<{ code: string }>("POST", "/api/member-invites", {
    jar: planner,
    csrf: true,
    body: { staffId: 1 },
  });
  const jar: CookieJar = new Map();
  const redeem = await client.request("POST", "/api/member/redeem", {
    jar,
    headers: SAME_ORIGIN,
    body: { code: invite.json!.code, client: "web", deviceName: "Firefox" },
  });
  expect(redeem.status).toBe(200);
  return jar;
}

describe("route policy in the auth middleware", () => {
  beforeEach(async () => {
    process.env.SHIFTPLAN_PUSH_RELAY_URL = "off";
    client = await createApiClient(ROUTES, (db) => {
      db.prepare("INSERT INTO staff (name, short_code) VALUES ('Anna Weber', 'AW')").run();
      db.prepare(
        "INSERT INTO shifts (name, active, start_time, end_time, color, min_staff, sort_order) VALUES ('Frühschicht', 1, '06:00', '14:00', '#22c55e', 1, 1)"
      ).run();
    });
  });

  afterEach(() => {
    client.close();
    delete process.env.SHIFTPLAN_PUSH_RELAY_URL;
  });

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
