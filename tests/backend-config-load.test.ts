import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import exampleConfig from "../config/backend.config.json";
import fullConfig from "./fixtures/backend.config.full.json";
import { getBackendConfig, resetBackendConfigForTests } from "~/server/config/backend-config";
import { validateBackendConfig } from "~/server/config/backend-config.schema";
import { ROUTE_POLICY } from "~/server/config/route-policy";
import { BACKEND_CONFIG_DEFAULTS } from "~/server/lib/config/defaults.js";
import { loadBackendConfig, mergeBackendConfig } from "~/server/lib/config/load.js";

// tests/fixtures/backend.config.full.json is config/backend.config.json as every release up to v3.16 shipped
// it: complete, and self-hosters mount copies of it. getBackendConfig() returned that file plus auth.routes.
const expectedFromFullFile = { ...fullConfig, auth: { ...fullConfig.auth, routes: { csrfMethods: [...ROUTE_POLICY.csrfMethods] } } };

let dir: string;

function mount(content: unknown): string {
  const file = path.join(dir, "backend.config.json");
  fs.writeFileSync(file, JSON.stringify(content));
  vi.stubEnv("SHIFTPLAN_BACKEND_CONFIG_PATH", file);
  return file;
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "shiftplan-config-load-"));
  resetBackendConfigForTests();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  resetBackendConfigForTests();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("backend config defaults", () => {
  it("are complete: they pass the schema and hold every key of the complete file", () => {
    expect(() => validateBackendConfig(structuredClone(BACKEND_CONFIG_DEFAULTS))).not.toThrow();
    expect(BACKEND_CONFIG_DEFAULTS).toEqual(fullConfig);
  });

  it("apply when there is no config file", () => {
    vi.stubEnv("SHIFTPLAN_BACKEND_CONFIG_PATH", "");
    vi.spyOn(process, "cwd").mockReturnValue(dir);

    expect(loadBackendConfig()).toEqual(BACKEND_CONFIG_DEFAULTS);
    expect(getBackendConfig()).toEqual(expectedFromFullFile);
  });

  it("stay untouched by the example file in config/, so mounting it unchanged changes nothing", () => {
    expect(mergeBackendConfig(structuredClone(BACKEND_CONFIG_DEFAULTS), exampleConfig)).toEqual(BACKEND_CONFIG_DEFAULTS);
  });
});

describe("backend config file", () => {
  it("gives exactly the config a complete mounted file gave before the defaults moved into code", () => {
    mount(fullConfig);

    expect(loadBackendConfig()).toEqual(fullConfig);
    expect(getBackendConfig()).toEqual(expectedFromFullFile);
  });

  it("wins over the defaults for every key it names", () => {
    const changed = changeEveryValue(structuredClone(fullConfig) as Record<string, unknown>);
    mount(changed);

    expect(loadBackendConfig()).toMatchObject(changed);
  });

  it("starts quietly as an older complete copy with auth.routes lists and contactMail.dateLocale", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const legacy = structuredClone(fullConfig);
    Object.assign(legacy.auth, {
      routes: {
        public: ["/api/auth/login", "/api/auth/session", "/api/analytics/visit", "/api/contact"],
        publicGetPrefixes: ["/api/_nuxt_icon", "/api/staff", "/api/shift", "/api/shiftplan", "/api/rotation", "/api/holidays"],
        csrfMethods: ["POST", "PATCH", "PUT", "DELETE"],
      },
    });
    Object.assign(legacy.contactMail, { dateLocale: "de-DE" });
    mount(legacy);

    // Unknown keys stay in the object, as before; the schema only warns about this one.
    expect(getBackendConfig()).toEqual({ ...expectedFromFullFile, contactMail: { ...expectedFromFullFile.contactMail, dateLocale: "de-DE" } });
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]![0]).toMatch(/contactMail\.dateLocale is ignored/);
  });

  it("only needs the keys that differ: objects merge, lists and single values replace", () => {
    mount({
      auth: { session: { durationMinutes: 120 } },
      holidays: { public: { subdivisionCodes: ["BY"] }, school: { defaultSubdivisionCodes: ["BY"] }, subdivisionNames: { XX: "Test" } },
    });
    const config = getBackendConfig();

    expect(config.auth.session).toEqual({ ...BACKEND_CONFIG_DEFAULTS.auth.session, durationMinutes: 120 });
    expect(config.auth.passwordPolicy).toEqual(BACKEND_CONFIG_DEFAULTS.auth.passwordPolicy);
    expect(config.holidays.public.subdivisionCodes).toEqual(["BY"]);
    expect(config.holidays.school).toEqual({ ...BACKEND_CONFIG_DEFAULTS.holidays.school, defaultSubdivisionCodes: ["BY"] });
    expect(config.holidays.subdivisionNames).toEqual({ ...BACKEND_CONFIG_DEFAULTS.holidays.subdivisionNames, XX: "Test" });
    expect(config.contact).toEqual(BACKEND_CONFIG_DEFAULTS.contact);
  });

  it("fails on an invalid value with the schema's message, as a complete file did", () => {
    mount({ auth: { passwordPolicy: { minLength: 0 } }, holidays: { public: { subdivisionCodes: ["XX"] } } });

    expect(() => getBackendConfig()).toThrow(
      "Invalid backend configuration:\n- auth.passwordPolicy.minLength must not be less than 1\n- holidays.subdivisionNames has no name for state XX"
    );
  });

  it("keeps unknown keys for the schema, so legacy route lists warn or fail as before", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mount({ auth: { routes: { public: ["/api/auth/login", "/api/auth/session", "/api/analytics/visit", "/api/contact", "/api/staff"] } } });
    expect(getBackendConfig().auth.routes).toEqual({ csrfMethods: [...ROUTE_POLICY.csrfMethods] });
    expect(warn.mock.calls[0]![0]).toMatch(/auth\.routes\.public is ignored/);

    resetBackendConfigForTests();
    mount({ auth: { routes: { publicGetPrefixes: ["/api/staff"] } } });
    expect(() => getBackendConfig()).toThrow(/auth\.routes\.publicGetPrefixes leaves out/);
  });

  it("fails clearly when it is missing, a directory, not JSON or not an object", () => {
    vi.stubEnv("SHIFTPLAN_BACKEND_CONFIG_PATH", path.join(dir, "missing.json"));
    expect(() => getBackendConfig()).toThrow(/missing\.json does not exist/);
    vi.stubEnv("SHIFTPLAN_BACKEND_CONFIG_PATH", dir);
    expect(() => getBackendConfig()).toThrow(/is a directory/);
    const file = mount(["not", "an", "object"]);
    expect(() => getBackendConfig()).toThrow(/must hold a JSON object/);
    fs.writeFileSync(file, "{ not json");
    expect(() => getBackendConfig()).toThrow(/is not valid JSON/);
  });
});

it("mergeBackendConfig merges objects and replaces lists, single values and null", () => {
  const merged = mergeBackendConfig({ a: { b: 1, c: [1, 2], d: { e: 1 } }, f: 1 }, { a: { c: [3], d: null }, g: { h: 1 } });
  expect(merged).toEqual({ a: { b: 1, c: [3], d: null }, f: 1, g: { h: 1 } });
});

/** Every leaf gets another value, so a test can tell the file's values from the defaults. */
function changeEveryValue(value: Record<string, unknown>): Record<string, unknown> {
  for (const [key, entry] of Object.entries(value)) {
    if (Array.isArray(entry)) value[key] = [...entry, "changed"];
    else if (entry && typeof entry === "object") changeEveryValue(entry as Record<string, unknown>);
    else value[key] = typeof entry === "number" ? entry + 1 : typeof entry === "boolean" ? !entry : `${entry}-changed`;
  }
  return value;
}
