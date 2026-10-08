import { describe, expect, it, vi } from "vitest";
import { EARLY, MAX, bearer, client, useMemberAccessClient } from "./helpers/member-access";
import { webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
useMemberAccessClient();

describe("planner sessions in the app", () => {
  it("returns a Bearer token without cookies and needs no CSRF token with it", async () => {
    const login = await client.request<{ token: string; expiresAt: number }>("POST", "/api/auth/login", {
      body: { username: "planner", password: "planner1234", client: "app" },
    });
    const assign = await client.request("POST", "/api/shiftplan/assign", {
      headers: bearer(login.json!.token),
      body: { staff_id: MAX, shift_id: EARLY, year: 2030, week: 10 },
    });
    const audit = client.mainDb.prepare("SELECT username, source FROM audit_log").get();

    expect(login.headers.some(([name]) => name.toLowerCase() === "set-cookie")).toBe(false);
    expect(login.json!.expiresAt - Date.now()).toBeGreaterThan(13 * 24 * 60 * 60 * 1000);
    expect(assign.status).toBe(200);
    expect(audit).toEqual({ username: "planner", source: "app" });
  });

  it("still requires CSRF for cookie sessions", async () => {
    const planner = await client.loginAs("planner", "planner1234");
    const withoutCsrf = await client.request("POST", "/api/shiftplan/assign", {
      jar: planner,
      body: { staff_id: MAX, shift_id: EARLY, year: 2030, week: 10 },
    });
    expect(withoutCsrf.status).toBe(403);
  });
});
