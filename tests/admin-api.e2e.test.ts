import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApiClient, type ApiClient, type CookieJar } from "./helpers/api-harness";
import { apiRoutes } from "./helpers/routes";

// Admin pages: user list, visit statistics and contact messages. Visits are counted on a public route.
const BROWSER = { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15" };

let client: ApiClient;
let admin: CookieJar;
let planner: CookieJar;

beforeAll(async () => {
  client = await createApiClient(
    apiRoutes("auth/login.post.ts", "auth/users.get.ts", "analytics/index.get.ts", "analytics/visit.post.ts", "contact/messages/[id].patch.ts")
  );
  client.adminDb
    .prepare("INSERT INTO contact_messages (name, reply_to, message, created_at) VALUES ('Eva', 'eva@example.com', 'Bitte um Rückruf.', datetime('now'))")
    .run();
  admin = await client.loginAs("admin", "admin1234");
  planner = await client.loginAs("planner", "planner1234");
});

afterAll(() => client.close());

describe("user list", () => {
  it("shows admins every account without password hashes", async () => {
    const response = await client.request<any[]>("GET", "/api/auth/users", { jar: admin });

    expect(response.status).toBe(200);
    expect(response.json!.map((user) => [user.username, user.role])).toEqual([
      ["admin", "admin"],
      ["planner", "planner"],
    ]);
    expect(response.json!.every((user) => !("password_hash" in user))).toBe(true);
  });

  it("is not for planners", async () => {
    expect((await client.request("GET", "/api/auth/users", { jar: planner })).status).toBe(403);
  });
});

describe("visit statistics", () => {
  it("counts page views from browsers without sign-in, but not from bots or for API paths", async () => {
    const page = await client.request<any>("POST", "/api/analytics/visit", { headers: BROWSER, body: { path: "/?week=3" } });
    const bot = await client.request<any>("POST", "/api/analytics/visit", { headers: { "user-agent": "Googlebot/2.1" }, body: { path: "/" } });
    const api = await client.request<any>("POST", "/api/analytics/visit", { headers: BROWSER, body: { path: "/api/staff" } });

    expect([page.status, bot.status, api.status]).toEqual([200, 200, 200]);
    expect([page.json.tracked, bot.json.tracked, api.json.tracked]).toEqual([true, false, false]);
    expect(client.mainDb.prepare("SELECT path FROM page_visits").all()).toEqual([{ path: "/" }]);
  });

  it("shows admins the totals of the last days", async () => {
    await client.request("POST", "/api/analytics/visit", { headers: BROWSER, body: { path: "/datenschutz" } });
    const response = await client.request<any>("GET", "/api/analytics?days=7", { jar: admin });

    expect(response.status).toBe(200);
    expect(response.json.days).toBe(7);
    expect(response.json.totals.todayPageViews).toBeGreaterThanOrEqual(1);
    expect(response.json.topPages.map((page: { path: string }) => page.path)).toContain("/datenschutz");
  });

  it("are not for planners", async () => {
    expect((await client.request("GET", "/api/analytics", { jar: planner })).status).toBe(403);
  });
});

describe("contact messages", () => {
  it("let admins mark a message as read", async () => {
    const response = await client.request<any>("PATCH", "/api/contact/messages/1", { jar: admin, csrf: true });

    expect(response.status).toBe(200);
    expect(response.json).toMatchObject({ contact_id: 1, name: "Eva" });
    expect(response.json.read_at).toEqual(expect.any(String));
  });

  it("are not for planners and need an existing message", async () => {
    const asPlanner = await client.request("PATCH", "/api/contact/messages/1", { jar: planner, csrf: true });
    const unknown = await client.request("PATCH", "/api/contact/messages/99", { jar: admin, csrf: true });

    expect([asPlanner.status, unknown.status]).toEqual([403, 404]);
  });
});
