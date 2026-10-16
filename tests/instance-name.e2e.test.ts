import { afterEach, describe, expect, it, vi } from "vitest";
import { createApiClient, type ApiClient, type Route } from "./helpers/api-harness";

const ROUTES: Route[] = [
  ["get", "/api/instance", "server/api/instance.get"],
  ["get", "/api/team-access", "server/api/team-access/index.get"],
  ["post", "/api/auth/login", "server/api/auth/login.post"],
];

const storedName = (client: ApiClient) =>
  client.adminDb.prepare("SELECT value FROM settings WHERE key = 'instance_name'").get() as { value: string } | undefined;

describe("default instance name", () => {
  let client: ApiClient | null = null;

  afterEach(() => {
    client?.close();
    client = null;
    vi.doUnmock("~/i18n/server");
  });

  it("reads „Schichtplaner“ as before and is never stored", async () => {
    client = await createApiClient(ROUTES);
    const jar = await client.loginAs("admin", "admin1234");

    const instance = await client.request("GET", "/api/instance", { headers: { "accept-language": "fr-FR" } });
    const settings = await client.request("GET", "/api/team-access", { jar });
    const { TeamAccessService } = await import("~/server/services/team-access.service");

    expect(instance.json.name).toBe("Schichtplaner");
    expect(settings.json.instanceName).toBe("Schichtplaner");
    // The push relay gets the name in the instance's language, see push-relay.e2e.test.ts.
    expect(TeamAccessService.getInstanceName()).toBe("Schichtplaner");
    expect(storedName(client)).toBeUndefined();
  });

  it("comes from the catalog in the reader's language", async () => {
    vi.doMock("~/i18n/server", () => ({ t: (locale: string, key: string) => `${locale}:${key}` }));
    client = await createApiClient(ROUTES);

    const instance = await client.request("GET", "/api/instance");

    expect(instance.json.name).toBe("de:app.instance.defaultName");
  });

  it("gives way to the name the planner set", async () => {
    client = await createApiClient(ROUTES);
    client.adminDb.prepare("INSERT INTO settings (key, value) VALUES ('instance_name', 'Team Nord')").run();

    const instance = await client.request("GET", "/api/instance");

    expect(instance.json.name).toBe("Team Nord");
  });
});
