import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import backendConfig from "../config/backend.config.json";
import { DEFAULT_CLIENT_CONFIG } from "~/utils/client-config";
import { createApiClient, type ApiClient } from "./helpers/api-harness";

const INSTANCE_KEYS = [
  "apiVersion",
  "codeRequired",
  "csrf",
  "instanceId",
  "name",
  "nextWeekFromSaturday",
  "passwordPolicy",
  "shiftDefaults",
  "version",
];

describe("instance config for the web client", () => {
  let client: ApiClient | null = null;
  let configDir: string | null = null;

  afterEach(() => {
    client?.close();
    client = null;
    vi.unstubAllEnvs();
    if (configDir) fs.rmSync(configDir, { recursive: true, force: true });
    configDir = null;
  });

  async function readInstance() {
    client = await createApiClient([["get", "/api/instance", "server/api/instance.get"]]);
    const response = await client.request<Record<string, unknown>>("GET", "/api/instance");
    expect(response.status).toBe(200);
    return response.json!;
  }

  it("serves the checked-in config, which matches the client's code defaults", async () => {
    const instance = await readInstance();

    expect(Object.keys(instance).sort()).toEqual(INSTANCE_KEYS);
    expect({
      passwordPolicy: instance.passwordPolicy,
      shiftDefaults: instance.shiftDefaults,
      csrf: instance.csrf,
    }).toEqual(DEFAULT_CLIENT_CONFIG);
  });

  it("follows a mounted config without a rebuild", async () => {
    const custom = structuredClone(backendConfig);
    custom.auth.passwordPolicy = {
      ...custom.auth.passwordPolicy,
      minLength: 12,
      requireUppercase: false,
      hint: "Mindestens 12 Zeichen mit Zahl",
    };
    custom.auth.session.cookies.csrfName = "team_csrf";
    custom.auth.routes.csrfMethods = ["POST", "DELETE"];
    custom.validation.shift.defaultColor = "#0ea5e9";
    custom.validation.shift.minStaff.default = 2;
    configDir = fs.mkdtempSync(path.join(os.tmpdir(), "shiftplan-config-"));
    const configPath = path.join(configDir, "backend.config.json");
    fs.writeFileSync(configPath, JSON.stringify(custom));
    vi.stubEnv("SHIFTPLAN_BACKEND_CONFIG_PATH", configPath);

    const instance = await readInstance();

    expect(instance.passwordPolicy).toEqual({
      minLength: 12,
      maxLength: 256,
      requireUppercase: false,
      requireLowercase: true,
      requireNumber: true,
      hint: "Mindestens 12 Zeichen mit Zahl",
    });
    expect(instance.shiftDefaults).toEqual({ color: "#0ea5e9", minStaff: 2 });
    expect(instance.csrf).toEqual({ cookieName: "team_csrf", methods: ["POST", "DELETE"] });
  });
});
