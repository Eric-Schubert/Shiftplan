import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApiClient, type ApiClient } from "./helpers/api-harness";
import { apiRoutes } from "./helpers/routes";

const ROUTES = apiRoutes("instance.get.ts", "auth/login.post.ts", "team-access/index.get.ts", "team-access/index.post.ts", "member/login.post.ts");

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

  it("words server texts in it when the request names no supported language", async () => {
    const admin = await client.loginAs("admin", "admin1234");
    await setLocale(admin, "en");
    const login = (headers: Record<string, string>) => client.request("POST", "/api/member/login", { headers, body: { shortCode: "XX", pin: "482917" } });

    const plain = await login({});
    const french = await login({ "accept-language": "fr-FR" });
    const german = await login({ "accept-language": "de-DE" });
    const chosen = await login({ "accept-language": "en", cookie: "shiftplan_locale=de" });
    const access = await client.request("GET", "/api/team-access", { jar: admin });

    expect(plain.json).toMatchObject({ statusMessage: "Short code or PIN is incorrect" });
    expect(french.json).toMatchObject({ statusMessage: "Short code or PIN is incorrect" });
    expect(german.json).toMatchObject({ statusMessage: "Kürzel oder PIN stimmt nicht" });
    expect(chosen.json).toMatchObject({ statusMessage: "Kürzel oder PIN stimmt nicht" });
    expect(access.json).toMatchObject({ instanceName: "Shift planner" });
  });
});
