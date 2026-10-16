import { afterEach, describe, expect, it, vi } from "vitest";
import exampleConfig from "../config/backend.config.json";
import fullConfig from "./fixtures/backend.config.full.json";
import { backendConfigDir, mountBackendConfig, unmountBackendConfig } from "./helpers/backend-config";
import { getBackendConfig } from "~/server/config/backend-config";
import { validateBackendConfig } from "~/server/config/backend-config.schema";
import type { BackendConfigFile } from "~/server/config/backend-config.types";
import { ROUTE_POLICY } from "~/server/config/route-policy";
import { BACKEND_CONFIG_DEFAULTS } from "~/server/lib/config/defaults.js";
import { loadBackendConfig, mergeBackendConfig } from "~/server/lib/config/load.js";

// tests/fixtures/backend.config.full.json is config/backend.config.json as every release up to v3.16 shipped
// it: complete, and self-hosters mount copies of it. getBackendConfig() returned that file plus auth.routes.
const expectedFromFullFile = { ...fullConfig, auth: { ...fullConfig.auth, routes: { csrfMethods: [...ROUTE_POLICY.csrfMethods] } } };

afterEach(unmountBackendConfig);

describe("backend config defaults", () => {
  it("are complete: they pass the schema and hold every key of the complete file", () => {
    expect(() => validateBackendConfig(structuredClone(BACKEND_CONFIG_DEFAULTS))).not.toThrow();
    expect(BACKEND_CONFIG_DEFAULTS).toEqual(fullConfig);
  });

  it("apply when there is no config file", () => {
    vi.stubEnv("SHIFTPLAN_BACKEND_CONFIG_PATH", "");
    vi.spyOn(process, "cwd").mockReturnValue(backendConfigDir());

    expect(loadBackendConfig()).toEqual(BACKEND_CONFIG_DEFAULTS);
    expect(getBackendConfig()).toEqual(expectedFromFullFile);
  });

  it("stay untouched by the example file in config/, so mounting it unchanged changes nothing", () => {
    expect(mergeBackendConfig(structuredClone(BACKEND_CONFIG_DEFAULTS), exampleConfig)).toEqual(BACKEND_CONFIG_DEFAULTS);
  });
});

describe("a complete backend config file", () => {
  it("gives exactly the config it gave before the defaults moved into code", () => {
    mountBackendConfig(fullConfig);

    expect(loadBackendConfig()).toEqual(fullConfig);
    expect(getBackendConfig()).toEqual(expectedFromFullFile);
  });

  it("wins over the defaults for every key it names", () => {
    const changed = changeEveryValue(structuredClone(fullConfig) as Record<string, unknown>);
    mountBackendConfig(changed);

    expect(loadBackendConfig()).toMatchObject(changed);
  });

  it("starts quietly as an older copy with auth.routes lists and contactMail.dateLocale", () => {
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
    mountBackendConfig(legacy);

    // Unknown keys stay in the object, as before; the schema only warns about this one.
    expect(getBackendConfig()).toEqual({ ...expectedFromFullFile, contactMail: { ...expectedFromFullFile.contactMail, dateLocale: "de-DE" } });
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]![0]).toMatch(/contactMail\.dateLocale is ignored/);
  });

  it("keeps a shortened holidays.subdivisionNames list, which is the list of states the API accepts", () => {
    const austria = structuredClone(fullConfig) as unknown as BackendConfigFile;
    austria.holidays = { ...austria.holidays, countryIsoCode: "AT", subdivisionNames: { W: "Wien", T: "Tirol" } };
    austria.holidays.public.subdivisionCodes = ["W"];
    austria.holidays.school.defaultSubdivisionCodes = ["W", "T"];
    mountBackendConfig(austria);

    expect(getBackendConfig().holidays.subdivisionNames).toEqual({ W: "Wien", T: "Tirol" });
  });
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
