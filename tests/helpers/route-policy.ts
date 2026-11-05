import { afterEach, beforeEach, expect } from "vitest";
import { createApiClient, type ApiClient, type CookieJar } from "./api-harness";
import { apiRoutes } from "./routes";

// One case per class in server/config/route-policy.ts, through the real auth middleware.
// Paths without a handler answer 404 once the middleware lets them through.
const ROUTES = apiRoutes(
  "auth/login.post.ts",
  "auth/session.get.ts",
  "absences/index.get.ts",
  "team-access/index.post.ts",
  "viewer/login.post.ts",
  "member-invites/index.post.ts",
  "member/redeem.post.ts",
  "member/logout.post.ts",
  "shiftplan/assign.post.ts"
);

export const SAME_ORIGIN = { origin: "http://localhost", host: "localhost" };
export const FOREIGN_ORIGIN = { origin: "https://evil.example", host: "localhost" };
export const ASSIGNMENT = { staff_id: 1, shift_id: 1, year: 2030, week: 10 };

/** The client of the running test. */
export let client: ApiClient;

/** Fresh databases for every test with Anna (AW) and one shift; app pushes are off. */
export function useRoutePolicyClient() {
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
}

export async function setTeamCode(): Promise<string> {
  const admin = await client.loginAs("admin", "admin1234");
  const created = await client.request<{ code: string }>("POST", "/api/team-access", {
    jar: admin,
    csrf: true,
    body: { generate: true },
  });
  return created.json!.code;
}

/** A browser that redeemed a personal invite for Anna: signed in with the member cookie. */
export async function memberBrowser(): Promise<CookieJar> {
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
