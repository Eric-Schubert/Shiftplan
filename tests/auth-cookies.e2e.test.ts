import { describe, expect, it } from "vitest";
import { client, csrfCookieName, sessionCookieName, useAuthClient } from "./helpers/auth-client";

useAuthClient();

function setCookies(response: { headers: Iterable<[string, string]> }): string[] {
  return [...response.headers].filter(([name]) => name.toLowerCase() === "set-cookie").map(([, value]) => value);
}

describe("planner session cookies", () => {
  it("renews both cookies on activity, so an active planner stays signed in", async () => {
    const jar = await client.loginAs("planner", "planner1234");
    const sessionToken = jar.get(sessionCookieName);

    const assign = await client.request("POST", "/api/shiftplan/assign", {
      jar,
      csrf: true,
      body: { staff_id: 1, shift_id: 1, year: 2026, week: 14 },
    });
    const session = await client.request("GET", "/api/auth/session", { jar });

    for (const response of [assign, session]) {
      expect(setCookies(response)).toEqual([
        expect.stringMatching(new RegExp(`^${sessionCookieName}=${sessionToken};.*Max-Age=1800`)),
        expect.stringMatching(new RegExp(`^${csrfCookieName}=[0-9a-f]+;.*Max-Age=1800`)),
      ]);
    }
  });

  it("sets no cookies for app sessions", async () => {
    const login = await client.request<{ token: string }>("POST", "/api/auth/login", {
      body: { username: "planner", password: "planner1234", client: "app" },
    });
    const assign = await client.request("POST", "/api/shiftplan/assign", {
      headers: { authorization: `Bearer ${login.json!.token}` },
      body: { staff_id: 1, shift_id: 1, year: 2026, week: 14 },
    });

    expect(assign.status).toBe(200);
    expect(setCookies(assign)).toEqual([]);
  });

  it("signs a stale tab out even with an outdated CSRF token", async () => {
    const jar = await client.loginAs("planner", "planner1234");
    const sessionToken = jar.get(sessionCookieName);

    const logout = await client.request("POST", "/api/auth/logout", { jar, headers: { "x-csrf-token": "outdated" } });

    expect(logout.status).toBe(200);
    expect(jar.get(sessionCookieName)).toBe("");
    expect(jar.get(csrfCookieName)).toBe("");
    expect(client.adminDb.prepare("SELECT 1 FROM auth_sessions WHERE session_token = ?").get(sessionToken)).toBeUndefined();
  });
});
