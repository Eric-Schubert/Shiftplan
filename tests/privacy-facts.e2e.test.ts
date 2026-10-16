import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BACKEND_CONFIG_DEFAULTS as backendConfig } from "~/server/lib/config/defaults.js";
import type { PrivacyFacts } from "~/types/privacy";
import { DEFAULT_PRIVACY_FACTS, toPrivacyFacts } from "~/utils/legal/privacy-facts";
import { createApiClient, type ApiClient } from "./helpers/api-harness";
import { apiRoutes } from "./helpers/routes";

describe("privacy policy periods and cookies", () => {
  let client: ApiClient | null = null;
  let configDir: string | null = null;

  afterEach(() => {
    client?.close();
    client = null;
    vi.unstubAllEnvs();
    if (configDir) fs.rmSync(configDir, { recursive: true, force: true });
    configDir = null;
  });

  async function readFacts() {
    client = await createApiClient(apiRoutes("legal/privacy.get.ts"));
    const response = await client.request<PrivacyFacts>("GET", "/api/legal/privacy");
    expect(response.status).toBe(200);
    return response.json!;
  }

  it("serves the checked-in periods, which match the page's fallback", async () => {
    const facts = await readFacts();

    expect(facts.retentionDays).toEqual({
      auditLog: 730,
      absenceReasons: 90,
      requestMessages: 90,
      contactMessages: 365,
      analytics: 90,
      memberIdle: 365,
      memberCookie: 365,
      memberInvite: 7,
      plannerApp: 14,
      viewerSession: 180,
    });
    expect({ retentionDays: facts.retentionDays, session: facts.session }).toEqual({
      retentionDays: DEFAULT_PRIVACY_FACTS.retentionDays,
      session: DEFAULT_PRIVACY_FACTS.session,
    });
  });

  it("follows a mounted config", async () => {
    const custom = structuredClone(backendConfig);
    custom.analytics.retentionDays = 30;
    custom.auth.session.durationMinutes = 120;
    custom.auth.session.cookies.sessionName = "team_session";
    custom.auth.session.cookies.csrfName = "team_csrf";
    configDir = fs.mkdtempSync(path.join(os.tmpdir(), "shiftplan-config-"));
    const configPath = path.join(configDir, "backend.config.json");
    fs.writeFileSync(configPath, JSON.stringify(custom));
    vi.stubEnv("SHIFTPLAN_BACKEND_CONFIG_PATH", configPath);

    const facts = await readFacts();

    expect(facts.retentionDays.analytics).toBe(30);
    expect(facts.retentionDays.auditLog).toBe(730);
    expect(facts.session).toEqual({ durationMinutes: 120, cookieName: "team_session", csrfCookieName: "team_csrf" });
  });

  it("keeps the fallback for parts an older or failed answer lacks", () => {
    expect(toPrivacyFacts(null)).toEqual(DEFAULT_PRIVACY_FACTS);
    const facts = toPrivacyFacts({ microsoft: false, relayHost: "relay.example.net" });

    expect(facts.microsoft).toBe(false);
    expect(facts.appPush).toBe(true);
    expect(facts.relayHost).toBe("relay.example.net");
    expect(facts.retentionDays).toEqual(DEFAULT_PRIVACY_FACTS.retentionDays);
  });
});
