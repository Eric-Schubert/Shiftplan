import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
});
