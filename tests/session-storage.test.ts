import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import backendConfig from "../config/backend.config.json";

const originalCwd = process.cwd();
const originalBootstrapPassword = process.env.SHIFTPLAN_ADMIN_PASSWORD;

let tempDir: string | null = null;
let closeDatabase: (() => void) | null = null;

async function loadSessionModule() {
  process.env.SHIFTPLAN_ADMIN_PASSWORD = "BootstrapPass1";
  vi.resetModules();

  const databaseModule = await import("../server/utils/database");
  closeDatabase = databaseModule.closeDatabase;

  return import("../server/utils/session");
}

describe("persistent session storage", () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "shiftplan-session-"));
    process.chdir(tempDir);
  });

  afterEach(() => {
    closeDatabase?.();
    closeDatabase = null;
    process.chdir(originalCwd);
    if (originalBootstrapPassword === undefined) {
      delete process.env.SHIFTPLAN_ADMIN_PASSWORD;
    } else {
      process.env.SHIFTPLAN_ADMIN_PASSWORD = originalBootstrapPassword;
    }
    vi.unstubAllGlobals();
    vi.resetModules();

    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it("persists sessions across module reloads", async () => {
    const firstSessionModule = await loadSessionModule();
    const created = firstSessionModule.createSession({
      userId: 7,
      username: "planner",
      role: "planner",
    });

    closeDatabase?.();
    closeDatabase = null;

    const secondSessionModule = await loadSessionModule();
    expect(secondSessionModule.getSessionData(created.sessionToken)).toEqual({
      userId: 7,
      username: "planner",
      role: "planner",
    });
  });

  it("persists login throttle state across module reloads", async () => {
    const firstSessionModule = await loadSessionModule();
    firstSessionModule.recordFailedLogin("192.0.2.50");

    closeDatabase?.();
    closeDatabase = null;

    const secondSessionModule = await loadSessionModule();
    expect(secondSessionModule.checkRateLimit("192.0.2.50")).toEqual({
      allowed: true,
      remainingAttempts: 4,
      blockedForSeconds: 0,
    });
  });

  it("ignores spoofable proxy headers by default", async () => {
    vi.stubGlobal("getHeader", (event: any, name: string) => event.headers?.[name.toLowerCase()]);
    const sessionModule = await loadSessionModule();

    expect(
      sessionModule.getClientIP({
        headers: {
          "cf-connecting-ip": "198.51.100.10",
          "x-forwarded-for": "198.51.100.20",
          "x-real-ip": "198.51.100.30",
        },
        node: { req: { socket: { remoteAddress: "203.0.113.5" } } },
      })
    ).toBe("203.0.113.5");
  });

  it("uses proxy headers when they are explicitly trusted", async () => {
    const trustedProxyConfig = structuredClone(backendConfig);
    trustedProxyConfig.auth.trustProxyHeaders = true;
    fs.mkdirSync(path.join(tempDir!, "config"), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir!, "config", "backend.config.json"),
      JSON.stringify(trustedProxyConfig, null, 2)
    );
    vi.stubGlobal("getHeader", (event: any, name: string) => event.headers?.[name.toLowerCase()]);
    const sessionModule = await loadSessionModule();

    expect(
      sessionModule.getClientIP({
        headers: {
          "x-forwarded-for": "198.51.100.20, 198.51.100.21",
        },
        node: { req: { socket: { remoteAddress: "203.0.113.5" } } },
      })
    ).toBe("198.51.100.20");
  });
});
