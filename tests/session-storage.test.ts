import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalCwd = process.cwd();
const originalBootstrapPassword = process.env.SHIFTPLAN_ADMIN_PASSWORD;

let tempDir: string | null = null;
let closeDatabase: (() => void) | null = null;

async function loadSessionModules() {
  process.env.SHIFTPLAN_ADMIN_PASSWORD = "BootstrapPass1";
  vi.resetModules();

  const databaseModule = await import("../server/utils/database");
  closeDatabase = databaseModule.closeDatabase;

  return {
    adminDb: databaseModule.getAdminDatabase(),
    session: await import("../server/utils/session"),
    rateLimit: await import("../server/lib/session/rate-limit"),
  };
}

function reload() {
  closeDatabase?.();
  closeDatabase = null;
  return loadSessionModules();
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
    const first = await loadSessionModules();
    const admin = first.adminDb.prepare("SELECT user_id FROM users WHERE username = 'admin'").get() as {
      user_id: number;
    };
    const created = first.session.createSession({ userId: admin.user_id, username: "admin", role: "admin" });

    const second = await reload();
    expect(second.session.getSessionData(created.sessionToken)).toEqual({
      userId: admin.user_id,
      username: "admin",
      role: "admin",
    });
  });

  it("ends sessions of accounts that are gone or deactivated", async () => {
    const { adminDb, session } = await loadSessionModules();
    const ghost = session.createSession({ userId: 999, username: "ghost", role: "admin" });
    const admin = session.createSession({ userId: 1, username: "admin", role: "admin" });
    adminDb.prepare("UPDATE users SET active = 0 WHERE user_id = 1").run();

    expect(session.getSessionData(ghost.sessionToken)).toBeNull();
    expect(session.getSessionData(admin.sessionToken)).toBeNull();
  });

  it("persists login throttle state across module reloads", async () => {
    const first = await loadSessionModules();
    const bucket = [{ key: "login:192.0.2.50" }];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(first.rateLimit.reserveAttempt(bucket)).toBe(true);
      first.rateLimit.settleAttempt(bucket, false);
    }

    const second = await reload();
    expect(second.rateLimit.reserveAttempt(bucket)).toBe(false);
    expect(second.rateLimit.reserveAttempt([{ key: "login:192.0.2.51" }])).toBe(true);
  });

  it("counts attempts that are still running, so parallel guesses cannot pass the limit", async () => {
    const { rateLimit } = await loadSessionModules();
    const bucket = [{ key: "login:192.0.2.60" }];

    const reserved = Array.from({ length: 8 }, () => rateLimit.reserveAttempt(bucket));
    expect(reserved.filter(Boolean)).toHaveLength(5);

    // Successes give their attempt back, so a planner signing in often is never blocked.
    for (let attempt = 0; attempt < 5; attempt += 1) rateLimit.settleAttempt(bucket, true);
    expect(rateLimit.reserveAttempt(bucket)).toBe(true);
  });
});
