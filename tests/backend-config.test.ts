import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import backendConfig from "../config/backend.config.json";
import { validateBackendConfig } from "~/server/config/backend-config.schema";
import { getBackendConfig, resetBackendConfigForTests } from "~/server/config/backend-config";

describe("backend config", () => {
  it("validates the checked-in backend config", () => {
    expect(() => validateBackendConfig(backendConfig)).not.toThrow();
  });

  it("rejects holiday states without a configured name", () => {
    const invalidConfig = structuredClone(backendConfig);
    invalidConfig.holidays.public.subdivisionCodes = ["XX"];

    expect(() => validateBackendConfig(invalidConfig)).toThrow(/state XX/);
  });

  describe("SHIFTPLAN_TRUST_PROXY_HEADERS", () => {
    afterEach(() => {
      vi.unstubAllEnvs();
      resetBackendConfigForTests();
    });

    it("keeps the config file value when unset", () => {
      vi.stubEnv("SHIFTPLAN_TRUST_PROXY_HEADERS", "");
      resetBackendConfigForTests();
      expect(getBackendConfig().auth.trustProxyHeaders).toBe(backendConfig.auth.trustProxyHeaders);
    });

    it("overrides the config file value", () => {
      vi.stubEnv("SHIFTPLAN_TRUST_PROXY_HEADERS", "true");
      resetBackendConfigForTests();
      expect(getBackendConfig().auth.trustProxyHeaders).toBe(true);
    });

    it("accepts cloudflare for origins that only Cloudflare can reach", () => {
      vi.stubEnv("SHIFTPLAN_TRUST_PROXY_HEADERS", "Cloudflare");
      resetBackendConfigForTests();
      expect(getBackendConfig().auth.trustProxyHeaders).toBe("cloudflare");
    });

    it("rejects values other than true, false or cloudflare", () => {
      vi.stubEnv("SHIFTPLAN_TRUST_PROXY_HEADERS", "yes");
      resetBackendConfigForTests();
      expect(() => getBackendConfig()).toThrow(/SHIFTPLAN_TRUST_PROXY_HEADERS/);
    });
  });

  it("upper-cases CSRF methods, so a mounted \"post\" still protects POST", () => {
    const custom = structuredClone(backendConfig);
    Object.assign(custom.auth, { routes: { csrfMethods: ["post", "Delete"] } });
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shiftplan-config-"));
    const configPath = path.join(dir, "backend.config.json");
    fs.writeFileSync(configPath, JSON.stringify(custom));
    vi.stubEnv("SHIFTPLAN_BACKEND_CONFIG_PATH", configPath);
    resetBackendConfigForTests();

    try {
      expect(getBackendConfig().auth.routes.csrfMethods).toEqual(["POST", "DELETE"]);
    } finally {
      vi.unstubAllEnvs();
      resetBackendConfigForTests();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
