import bcrypt from "bcryptjs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { client, useAuthClient } from "./helpers/auth-client";

// Behind a proxy, so every request can come from its own address.
vi.stubEnv("SHIFTPLAN_TRUST_PROXY_HEADERS", "true");
useAuthClient();

function login(username: string, password: string, ip = "198.51.100.1") {
  return client.request("POST", "/api/auth/login", {
    headers: { "x-forwarded-for": ip },
    body: { username, password },
  });
}

async function statuses(count: number, attempt: () => Promise<{ status: number }>): Promise<number[]> {
  const result: number[] = [];
  for (let index = 0; index < count; index += 1) result.push((await attempt()).status);
  return result;
}

describe("planner sign-in limits", () => {
  afterEach(() => vi.restoreAllMocks());

  it("counts parallel guesses before the password check finishes", async () => {
    const responses = await Promise.all(Array.from({ length: 10 }, () => login("admin", "Wrong1234")));
    const codes = responses.map((response) => response.status);

    expect(codes.filter((status) => status === 401)).toHaveLength(5);
    expect(codes.filter((status) => status === 429)).toHaveLength(5);
  });

  it("does not let a planner's own sign-in clear failures against another account", async () => {
    await statuses(4, () => login("admin", "Wrong1234"));

    expect((await login("planner", "planner1234")).status).toBe(200);
    expect((await login("admin", "Wrong1234")).status).toBe(401);
    expect((await login("admin", "admin1234")).status).toBe(429);
  });

  it("limits guesses against one account from many networks", async () => {
    for (const ip of ["198.51.100.1", "198.51.100.2", "198.51.100.3"]) {
      expect(await statuses(5, () => login("admin", "Wrong1234", ip))).toEqual([401, 401, 401, 401, 401]);
    }

    expect((await login("admin", "admin1234", "198.51.100.9")).status).toBe(429);
    expect((await login("planner", "planner1234", "198.51.100.9")).status).toBe(200);
  });

  it("does not let one network lock an account out", async () => {
    expect(await statuses(6, () => login("admin", "Wrong1234"))).toEqual([401, 401, 401, 401, 401, 429]);

    expect((await login("admin", "admin1234", "198.51.100.2")).status).toBe(200);
  });

  it("treats one IPv6 /64 as one network", async () => {
    for (let host = 1; host <= 5; host += 1) await login("admin", "Wrong1234", `2001:db8:1:2::${host}`);

    expect((await login("admin", "admin1234", "2001:db8:1:2::99")).status).toBe(429);
    expect((await login("admin", "admin1234", "2001:db8:1:3::1")).status).toBe(200);
  });

  it("checks a password hash for unknown and inactive accounts too", async () => {
    const compare = vi.spyOn(bcrypt, "compare");

    expect((await login("nobody", "Wrong1234")).status).toBe(401);
    expect((await login("disabled", "disabled1234")).status).toBe(401);
    expect(compare).toHaveBeenCalledTimes(2);
  });

  it("lets colleagues behind one network clear a few team code typos", async () => {
    client.adminDb.prepare("INSERT INTO settings (key, value) VALUES ('viewer_access_code', 'TEAMCODE42')").run();
    const teamLogin = (code: string) => client.request("POST", "/api/viewer/login", { body: { code } });

    expect(await statuses(4, () => teamLogin("TYPO"))).toEqual([401, 401, 401, 401]);
    expect((await teamLogin("teamcode42")).status).toBe(200);
    expect(await statuses(2, () => teamLogin("TYPO"))).toEqual([401, 401]);
    expect((await teamLogin("teamcode42")).status).toBe(200);
  });

  it("accepts sign-ins only as JSON, so a form on another site cannot sign a browser in", async () => {
    const paths = ["/api/auth/login", "/api/member/login", "/api/member/redeem", "/api/viewer/login"];
    const textPosts = await Promise.all(
      paths.map((path) =>
        client.request("POST", path, {
          headers: { "content-type": "text/plain;charset=UTF-8" },
          body: { username: "planner", password: "planner1234" },
        })
      )
    );
    const formPost = await client.request("POST", "/api/auth/login", {
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: { username: "planner", password: "planner1234" },
    });

    expect(textPosts.map((response) => response.status)).toEqual([415, 415, 415, 415]);
    expect(formPost.status).toBe(415);
  });
});
