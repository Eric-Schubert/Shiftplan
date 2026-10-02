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

    expect(() => validateBackendConfig(invalidConfig)).toThrow(/Bundesland XX/);
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

    it("rejects values other than true or false", () => {
      vi.stubEnv("SHIFTPLAN_TRUST_PROXY_HEADERS", "yes");
      resetBackendConfigForTests();
      expect(() => getBackendConfig()).toThrow(/SHIFTPLAN_TRUST_PROXY_HEADERS/);
    });
  });
});
