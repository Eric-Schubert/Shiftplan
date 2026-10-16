import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import backendConfig from "../config/backend.config.json";
import { getBackendConfig, resetBackendConfigForTests } from "~/server/config/backend-config";
import { ROUTE_POLICY } from "~/server/config/route-policy";

// auth.routes as every release up to the built-in route policy shipped it; self-hosters mount copies.
const OLD_ROUTES = {
  public: ["/api/auth/login", "/api/auth/session", "/api/analytics/visit", "/api/contact"],
  publicGetPrefixes: ["/api/_nuxt_icon", "/api/staff", "/api/shift", "/api/shiftplan", "/api/rotation", "/api/holidays"],
  csrfMethods: ["POST", "PATCH", "PUT", "DELETE"],
};

let configDir: string | null = null;

function mountConfig(routes: unknown) {
  const custom = structuredClone(backendConfig);
  Object.assign(custom.auth, { routes });
  configDir = fs.mkdtempSync(path.join(os.tmpdir(), "shiftplan-config-"));
  const configPath = path.join(configDir, "backend.config.json");
  fs.writeFileSync(configPath, JSON.stringify(custom));
  vi.stubEnv("SHIFTPLAN_BACKEND_CONFIG_PATH", configPath);
  resetBackendConfigForTests();
}

describe("auth.routes in the backend config", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    resetBackendConfigForTests();
    if (configDir) fs.rmSync(configDir, { recursive: true, force: true });
    configDir = null;
  });

  it("uses the policy's CSRF methods when the file has no auth.routes", () => {
    expect(backendConfig.auth).not.toHaveProperty("routes");
    expect(getBackendConfig().auth.routes).toEqual({ csrfMethods: [...ROUTE_POLICY.csrfMethods] });
  });

  it("starts quietly with an old mounted copy", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mountConfig(OLD_ROUTES);

    expect(getBackendConfig().auth.routes).toEqual({ csrfMethods: OLD_ROUTES.csrfMethods });
    expect(warn).not.toHaveBeenCalled();
  });

  it("ignores extra entries with a warning, so config cannot open a route", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mountConfig({ ...OLD_ROUTES, public: [...OLD_ROUTES.public, "/api/staff"] });

    expect(getBackendConfig().auth.routes).toEqual({ csrfMethods: OLD_ROUTES.csrfMethods });
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]![0]).toMatch(/auth\.routes\.public is ignored/);
  });

  it("refuses to start when a list leaves out a shipped entry, which needed a planner login", () => {
    const narrowed = OLD_ROUTES.publicGetPrefixes.filter((prefix) => prefix !== "/api/staff");
    mountConfig({ ...OLD_ROUTES, publicGetPrefixes: narrowed });

    expect(() => getBackendConfig()).toThrow(/auth\.routes\.publicGetPrefixes leaves out \/api\/staff/);
  });

  it("rejects route lists that are not lists", () => {
    mountConfig({ public: "/api/staff" });

    expect(() => getBackendConfig()).toThrow(/auth\.routes\.public must be a list of strings/);
  });

  it("rejects unknown CSRF methods", () => {
    mountConfig({ csrfMethods: ["POST", "FETCH"] });

    expect(() => getBackendConfig()).toThrow(/unknown HTTP method: FETCH/);
  });

  it("rejects an empty CSRF method list, which would turn CSRF off for cookie sessions", () => {
    mountConfig({ csrfMethods: [] });

    expect(() => getBackendConfig()).toThrow(/auth\.routes\.csrfMethods must not be empty/);
  });
});
