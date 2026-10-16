import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApiClient, type ApiClient, type Route } from "./helpers/api-harness";

const ROUTES: Route[] = [
  ["get", "/api/instance", "server/api/instance.get"],
  ["post", "/api/auth/login", "server/api/auth/login.post"],
  ["get", "/api/team-access", "server/api/team-access/index.get"],
  ["post", "/api/team-access", "server/api/team-access/index.post"],
];

describe("instance language", () => {
  let client: ApiClient;

  beforeEach(async () => {
    client = await createApiClient(ROUTES);
  });

  afterEach(() => client.close());

  const setLocale = (jar: Map<string, string> | undefined, instanceLocale: unknown) =>
    client.request("POST", "/api/team-access", { jar, csrf: true, body: { instanceLocale } });

  it("is German until an admin picks another language", async () => {
    const admin = await client.loginAs("admin", "admin1234");
    const before = await client.request("GET", "/api/instance");

    const saved = await setLocale(admin, "en");
    const access = await client.request("GET", "/api/team-access", { jar: admin });
    const after = await client.request("GET", "/api/instance");

    expect(before.json).toMatchObject({ locale: "de" });
    expect(saved.json).toEqual({ instanceLocale: "en" });
    expect(access.json).toMatchObject({ instanceLocale: "en" });
    expect(after.json).toMatchObject({ locale: "en" });
  });

  it("takes only offered languages and only from admins", async () => {
    const admin = await client.loginAs("admin", "admin1234");
    const planner = await client.loginAs("planner", "planner1234");

    const unknown = await setLocale(admin, "fr");
    const tag = await setLocale(admin, "en-GB");
    const notAdmin = await setLocale(planner, "en");

    expect(unknown.status).toBe(400);
    expect(unknown.json).toMatchObject({ statusMessage: "Diese Sprache gibt es hier nicht", data: { code: "errors.team.localeUnknown" } });
    expect(tag.status).toBe(400);
    expect(notAdmin.status).toBe(403);
    expect((await client.request("GET", "/api/instance")).json).toMatchObject({ locale: "de" });
  });
});
