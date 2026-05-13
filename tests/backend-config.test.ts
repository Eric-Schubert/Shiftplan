import { describe, expect, it } from "vitest";
import backendConfig from "../config/backend.config.json";
import { validateBackendConfig } from "~/server/config/backend-config.schema";

describe("backend config", () => {
  it("validates the checked-in backend config", () => {
    expect(() => validateBackendConfig(backendConfig)).not.toThrow();
  });

  it("rejects holiday states without a configured name", () => {
    const invalidConfig = structuredClone(backendConfig);
    invalidConfig.holidays.public.subdivisionCodes = ["XX"];

    expect(() => validateBackendConfig(invalidConfig)).toThrow(/Bundesland XX/);
  });
});
