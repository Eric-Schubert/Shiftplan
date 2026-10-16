import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import backendConfig from "../config/backend.config.json";
import type { ClientConfig } from "~/types/instance";
import { DEFAULT_CLIENT_CONFIG } from "~/utils/client-config";
import { createApiClient, type ApiClient, type Route } from "./helpers/api-harness";

const INSTANCE_KEYS = [
  "apiVersion",
  "codeRequired",
  "contactForm",
  "csrf",
  "instanceId",
  "name",
  "nextWeekFromSaturday",
  "passwordPolicy",
  "shift",
  "username",
  "version",
];
const ROUTES: Route[] = [
  ["get", "/api/instance", "server/api/instance.get"],
  ["post", "/api/auth/login", "server/api/auth/login.post"],
  ["post", "/api/shift", "server/api/shift/index.post"],
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
    client = await createApiClient(ROUTES);
    const response = await client.request<Record<string, unknown>>("GET", "/api/instance");
    expect(response.status).toBe(200);
    return response.json!;
  }

  it("serves the checked-in config, which matches the client's code defaults", async () => {
    const instance = await readInstance();

    expect(Object.keys(instance).sort()).toEqual(INSTANCE_KEYS);
    expect({
      passwordPolicy: instance.passwordPolicy,
      username: instance.username,
      contactForm: instance.contactForm,
      shift: instance.shift,
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
    Object.assign(custom.auth, { routes: { csrfMethods: ["post", "DELETE"] } });
    custom.validation.shift.defaultColor = "#0ea5e9";
    custom.validation.shift.minStaff = { default: 2, min: 1, max: 20 };
    custom.auth.users.usernameMinLength = 5;
    custom.contact.form.message.minLength = 20;
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
    expect(instance.shift).toEqual({ defaultColor: "#0ea5e9", minStaff: { default: 2, min: 1, max: 20 } });
    expect(instance.csrf).toEqual({ cookieName: "team_csrf", methods: ["POST", "DELETE"] });
    expect(instance.username).toEqual({ minLength: 5, maxLength: 100 });
    expect((instance.contactForm as ClientConfig["contactForm"]).message).toEqual({ minLength: 20, maxLength: 4000 });

    const admin = await client!.loginAs("admin", "admin1234");
    const withoutToken = await client!.request("POST", "/api/shift", { jar: admin, body: { name: "Spät" } });
    expect(withoutToken.status).toBe(403);
  });
});
