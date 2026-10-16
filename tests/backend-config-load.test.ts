import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { backendConfigDir, mountBackendConfig, unmountBackendConfig } from "./helpers/backend-config";
import { getBackendConfig, resetBackendConfigForTests } from "~/server/config/backend-config";
import { ROUTE_POLICY } from "~/server/config/route-policy";
import { BACKEND_CONFIG_DEFAULTS } from "~/server/lib/config/defaults.js";
import { mergeBackendConfig } from "~/server/lib/config/load.js";

afterEach(unmountBackendConfig);

describe("a partial backend config file", () => {
  it("only needs the keys that differ: objects merge, lists and single values replace", () => {
    mountBackendConfig({
      auth: { session: { durationMinutes: 120 } },
      holidays: { public: { subdivisionCodes: ["BY"] }, school: { defaultSubdivisionCodes: ["BY"] } },
    });
    const config = getBackendConfig();

    expect(config.auth.session).toEqual({ ...BACKEND_CONFIG_DEFAULTS.auth.session, durationMinutes: 120 });
    expect(config.auth.passwordPolicy).toEqual(BACKEND_CONFIG_DEFAULTS.auth.passwordPolicy);
    expect(config.holidays.public.subdivisionCodes).toEqual(["BY"]);
    expect(config.holidays.school).toEqual({ ...BACKEND_CONFIG_DEFAULTS.holidays.school, defaultSubdivisionCodes: ["BY"] });
    expect(config.holidays.subdivisionNames).toEqual(BACKEND_CONFIG_DEFAULTS.holidays.subdivisionNames);
    expect(config.contact).toEqual(BACKEND_CONFIG_DEFAULTS.contact);
  });

  it("replaces holidays.subdivisionNames as a whole, so exactly the named states are accepted", () => {
    mountBackendConfig({
      holidays: { public: { subdivisionCodes: ["BY"] }, school: { defaultSubdivisionCodes: ["BY"] }, subdivisionNames: { BY: "Bayern" } },
    });

    expect(getBackendConfig().holidays.subdivisionNames).toEqual({ BY: "Bayern" });
  });

  it("fails on an invalid value with the schema's message, as a complete file did", () => {
    mountBackendConfig({ auth: { passwordPolicy: { minLength: 0 } }, holidays: { public: { subdivisionCodes: ["XX"] } } });

    expect(() => getBackendConfig()).toThrow(
      "Invalid backend configuration:\n- auth.passwordPolicy.minLength must not be less than 1\n- holidays.subdivisionNames has no name for state XX"
    );
  });

  it("keeps unknown keys for the schema, so legacy route lists warn or fail as before", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mountBackendConfig({ auth: { routes: { public: ["/api/auth/login", "/api/auth/session", "/api/analytics/visit", "/api/contact", "/api/staff"] } } });
    expect(getBackendConfig().auth.routes).toEqual({ csrfMethods: [...ROUTE_POLICY.csrfMethods] });
    expect(warn.mock.calls[0]![0]).toMatch(/auth\.routes\.public is ignored/);

    mountBackendConfig({ auth: { routes: { publicGetPrefixes: ["/api/staff"] } } });
    expect(() => getBackendConfig()).toThrow(/auth\.routes\.publicGetPrefixes leaves out/);
  });

  it("fails clearly when it is missing, a directory, unreadable, not JSON or not an object", () => {
    const dir = backendConfigDir();
    vi.stubEnv("SHIFTPLAN_BACKEND_CONFIG_PATH", path.join(dir, "missing.json"));
    expect(() => getBackendConfig()).toThrow(/missing\.json does not exist/);
    vi.stubEnv("SHIFTPLAN_BACKEND_CONFIG_PATH", dir);
    expect(() => getBackendConfig()).toThrow(/is a directory/);

    const file = mountBackendConfig(["not", "an", "object"]);
    expect(() => getBackendConfig()).toThrow(/must hold a JSON object/);
    fs.writeFileSync(file, "{ not json");
    expect(() => getBackendConfig()).toThrow(/is not valid JSON/);
    fs.chmodSync(file, 0o000);
    resetBackendConfigForTests();
    expect(() => getBackendConfig()).toThrow(/cannot be read: EACCES/);
  });
});

describe("mergeBackendConfig", () => {
  it("merges objects and replaces lists, single values and null", () => {
    const merged = mergeBackendConfig({ a: { b: 1, c: [1, 2], d: { e: 1 } }, f: 1 }, { a: { c: [3], d: null }, g: { h: 1 } });
    expect(merged).toEqual({ a: { b: 1, c: [3], d: null }, f: 1, g: { h: 1 } });
  });

  it("skips __proto__ from the file, so it cannot set the prototype of a settings object", () => {
    const merged = mergeBackendConfig({ auth: { x: 1 } }, JSON.parse('{"auth":{"__proto__":{"routes":{"csrfMethods":["GET"]}}}}'));
    expect(Object.getPrototypeOf(merged.auth)).toBe(Object.prototype);
    expect(merged.auth).toEqual({ x: 1 });
  });
});
