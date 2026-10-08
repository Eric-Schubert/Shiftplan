import { describe, expect, it } from "vitest";
import { client, useAuthClient } from "./helpers/auth-client";

useAuthClient();

describe("auth and planner e2e", () => {
  it("allows admins to create planner users", async () => {
    const jar = await client.loginAs("admin", "admin1234");

    const created = await client.request<{
      success: boolean;
      username: string;
      role: string;
    }>("POST", "/api/auth/users", {
      jar,
      csrf: true,
      body: { username: "newplanner", password: "Newplanner1234", role: "planner" },
    });
    const user = client.adminDb
      .prepare("SELECT username, role, active FROM users WHERE username = ?")
      .get("newplanner");

    expect(created.status).toBe(200);
    expect(created.json).toMatchObject({
      success: true,
      username: "newplanner",
      role: "planner",
    });
    expect(user).toMatchObject({
      username: "newplanner",
      role: "planner",
      active: 1,
    });
  });

  it("rejects weak passwords when admins create users", async () => {
    const jar = await client.loginAs("admin", "admin1234");

    const created = await client.request("POST", "/api/auth/users", {
      jar,
      csrf: true,
      body: { username: "weakplanner", password: "weakpass1", role: "planner" },
    });
    const user = client.adminDb
      .prepare("SELECT username FROM users WHERE username = ?")
      .get("weakplanner");

    expect(created.status).toBe(400);
    expect(user).toBeUndefined();
  });
});
