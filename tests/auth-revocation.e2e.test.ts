import { afterEach, describe, expect, it, vi } from "vitest";
import type { CookieJar, RequestOptions } from "./helpers/api-harness";
import { client, useAuthClient } from "./helpers/auth-client";

useAuthClient();

const ASSIGN = { staff_id: 1, shift_id: 1, year: 2026, week: 14 };

function assign(options: RequestOptions) {
  return client.request("POST", "/api/shiftplan/assign", { ...options, body: ASSIGN });
}

async function appLogin(username: string, password: string) {
  const login = await client.request<{ token: string }>("POST", "/api/auth/login", {
    body: { username, password, client: "app" },
  });
  return { authorization: `Bearer ${login.json!.token}` };
}

function changePassword(jar: CookieJar, currentPassword: string, newPassword: string) {
  return client.request("POST", "/api/auth/change-password", { jar, csrf: true, body: { currentPassword, newPassword } });
}

function userId(username: string): number {
  return (client.adminDb.prepare("SELECT user_id FROM users WHERE username = ?").get(username) as { user_id: number })
    .user_id;
}

describe("ending planner sessions", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("signs a deleted planner out of the browser and the app", async () => {
    const admin = await client.loginAs("admin", "admin1234");
    const planner = await client.loginAs("planner", "planner1234");
    const plannerApp = await appLogin("planner", "planner1234");
    const plannerId = userId("planner");

    const deleted = await client.request("DELETE", `/api/auth/users/${plannerId}`, { jar: admin, csrf: true });
    const viaCookie = await assign({ jar: planner, csrf: true });
    const viaBearer = await assign({ headers: plannerApp });
    const session = await client.request("GET", "/api/auth/session", { jar: planner });

    expect(deleted.status).toBe(200);
    expect(viaCookie.status).toBe(401);
    expect(viaBearer.status).toBe(401);
    expect(session.json).toEqual({ authenticated: false });
    expect(client.adminDb.prepare("SELECT COUNT(*) AS count FROM auth_sessions WHERE user_id = ?").get(plannerId)).toEqual({
      count: 0,
    });
  });

  it("stops a deleted admin from creating a new admin", async () => {
    const admin = await client.loginAs("admin", "admin1234");
    await client.request("POST", "/api/auth/users", {
      jar: admin,
      csrf: true,
      body: { username: "second", password: "Second1234", role: "admin" },
    });
    const second = await client.loginAs("second", "Second1234");
    await client.request("DELETE", `/api/auth/users/${userId("second")}`, { jar: admin, csrf: true });

    const backdoor = await client.request("POST", "/api/auth/users", {
      jar: second,
      csrf: true,
      body: { username: "backdoor", password: "Backdoor1234", role: "admin" },
    });

    expect(backdoor.status).toBe(401);
    expect(client.adminDb.prepare("SELECT 1 FROM users WHERE username = 'backdoor'").get()).toBeUndefined();
  });

  it("ends the other sessions when the password changes", async () => {
    const current = await client.loginAs("planner", "planner1234");
    const other = await client.loginAs("planner", "planner1234");
    const app = await appLogin("planner", "planner1234");

    const changed = await changePassword(current, "planner1234", "Newplanner1234");

    expect(changed.status).toBe(200);
    expect((await assign({ jar: current, csrf: true })).status).toBe(200);
    expect((await assign({ jar: other, csrf: true })).status).toBe(401);
    expect((await assign({ headers: app })).status).toBe(401);
  });

  it("limits guesses of the current password", async () => {
    const jar = await client.loginAs("planner", "planner1234");

    const statuses: number[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      statuses.push((await changePassword(jar, "Wrong12345", "Newplanner1234")).status);
    }
    const withRightPassword = await changePassword(jar, "planner1234", "Newplanner1234");

    expect(statuses).toEqual([401, 401, 401, 401, 401, 429]);
    expect(withRightPassword.status).toBe(429);
  });

  it("keeps the password of the published demo account", async () => {
    vi.stubEnv("NUXT_PUBLIC_DEMO_LOGIN_USERNAME", "planner");
    vi.stubEnv("NUXT_PUBLIC_DEMO_LOGIN_PASSWORD", "planner1234");
    const demo = await client.loginAs("planner", "planner1234");
    const admin = await client.loginAs("admin", "admin1234");

    expect((await changePassword(demo, "planner1234", "Newplanner1234")).status).toBe(403);
    expect((await changePassword(admin, "admin1234", "Newadmin1234")).status).toBe(200);
  });
});
