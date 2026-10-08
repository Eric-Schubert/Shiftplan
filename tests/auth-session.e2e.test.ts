import { describe, expect, it } from "vitest";
import { client, csrfCookieName, sessionCookieName, useAuthClient } from "./helpers/auth-client";

useAuthClient();

describe("auth and planner e2e", () => {
  it("logs in with user credentials without exposing session tokens", async () => {
    const jar = new Map<string, string>();

    const login = await client.request<{
      success: boolean;
      user: { username: string; role: string };
      token?: string;
      sessionToken?: string;
    }>("POST", "/api/auth/login", {
      jar,
      body: { username: "planner", password: "planner1234" },
    });

    expect(login.status).toBe(200);
    expect(login.json).toMatchObject({
      success: true,
      user: { username: "planner", role: "planner" },
    });
    expect(login.json?.token).toBeUndefined();
    expect(login.json?.sessionToken).toBeUndefined();
    expect(jar.get(sessionCookieName)).toBeTruthy();
    expect(jar.get(csrfCookieName)).toBeTruthy();

    const session = await client.request<{
      authenticated: boolean;
      user: { username: string; role: string };
      csrfToken: string;
    }>("GET", "/api/auth/session", { jar });

    expect(session.status).toBe(200);
    expect(session.json).toMatchObject({
      authenticated: true,
      user: { username: "planner", role: "planner" },
      csrfToken: jar.get(csrfCookieName),
    });
  });

  it("rejects inactive users and invalid credentials", async () => {
    const disabled = await client.request("POST", "/api/auth/login", {
      body: { username: "disabled", password: "disabled1234" },
      headers: { "x-forwarded-for": "127.0.0.2" },
    });
    const invalid = await client.request("POST", "/api/auth/login", {
      body: { username: "planner", password: "wrong-password" },
      headers: { "x-forwarded-for": "127.0.0.3" },
    });

    expect(disabled.status).toBe(401);
    expect(invalid.status).toBe(401);
  });

  it("requires a valid csrf token for authenticated mutations", async () => {
    const jar = await client.loginAs("planner", "planner1234");

    const missingCsrf = await client.request("POST", "/api/shiftplan/assign", {
      jar,
      body: { staff_id: 1, shift_id: 1, year: 2026, week: 13 },
    });

    const invalidCsrf = await client.request("POST", "/api/shiftplan/assign", {
      jar,
      headers: { "x-csrf-token": "invalid-token" },
      body: { staff_id: 1, shift_id: 1, year: 2026, week: 13 },
    });

    expect(missingCsrf.status).toBe(403);
    expect(invalidCsrf.status).toBe(403);
  });
});
