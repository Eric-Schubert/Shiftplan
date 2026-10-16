import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApiClient, type ApiClient, type CookieJar } from "./helpers/api-harness";

let client: ApiClient;
let admin: CookieJar;

beforeEach(async () => {
  client = await createApiClient([
    ["post", "/api/auth/login", "server/api/auth/login.post"],
    ["post", "/api/staff", "server/api/staff/index.post"],
    ["post", "/api/auth/users", "server/api/auth/users.post"],
  ]);
  admin = await client.loginAs("admin", "admin1234");
});

afterEach(() => client.close());

describe("JSON bodies of write requests", () => {
  it.each([
    ["no body", undefined, {}],
    ["null", null, {}],
    ["a list", [1, 2], {}],
    ["a number", 5, {}],
    ["a JSON string", "{name", {}],
    ["plain text", "Anna", { "content-type": "text/plain" }],
  ])("answers %s with 400 and a catalog code instead of a 500", async (_label, body, headers) => {
    const response = await client.request("POST", "/api/staff", { jar: admin, csrf: true, headers, body });

    expect(response.status).toBe(400);
    expect(response.json?.data?.code).toBe("errors.common.bodyObject");
  });

  it("still creates staff from a JSON object", async () => {
    const response = await client.request("POST", "/api/staff", { jar: admin, csrf: true, body: { name: "Anna Weber" } });
    expect(response.status).toBe(200);
  });

  it("rejects a non-text user name or password with 400", async () => {
    for (const body of [
      { username: 12345, password: "Secret123", role: "planner" },
      { username: "maria", password: ["Secret123"], role: "planner" },
    ]) {
      const response = await client.request("POST", "/api/auth/users", { jar: admin, csrf: true, body });
      expect(response.status).toBe(400);
      expect(response.json?.data?.code).toBe("errors.auth.userFieldsRequired");
    }
  });
});
