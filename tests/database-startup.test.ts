import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalCwd = process.cwd();
const originalPassword = process.env.SHIFTPLAN_ADMIN_PASSWORD;
let tempDir: string;
let closeDatabase: (() => void) | undefined;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "shiftplan-startup-"));
  process.chdir(tempDir);
  delete process.env.SHIFTPLAN_ADMIN_PASSWORD;
  vi.resetModules();
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  closeDatabase?.();
  process.chdir(originalCwd);
  if (originalPassword === undefined) delete process.env.SHIFTPLAN_ADMIN_PASSWORD;
  else process.env.SHIFTPLAN_ADMIN_PASSWORD = originalPassword;
  vi.restoreAllMocks();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("opening the admin database", () => {
  it("hands out no half-migrated database when a migration fails, and retries on the next call", async () => {
    const { getDatabasePaths } = await import("~/server/config/database-config");
    const adminPath = getDatabasePaths().admin;
    fs.mkdirSync(path.dirname(adminPath), { recursive: true });
    // An old installation that still has the default password admin.
    const legacy = new Database(adminPath);
    legacy.exec("CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT)");
    legacy.prepare("INSERT INTO settings (key, value) VALUES ('admin_password', 'admin')").run();
    legacy.close();

    const database = await import("~/server/utils/database");
    closeDatabase = database.closeDatabase;

    expect(() => database.getAdminDatabase()).toThrow(/Insecure default credentials/);
    expect(() => database.getAdminDatabase()).toThrow(/Insecure default credentials/);

    process.env.SHIFTPLAN_ADMIN_PASSWORD = "BootstrapPass1";
    const applied = database.getAdminDatabase().prepare("SELECT id FROM schema_migrations WHERE id = '013_admin_push_locale'").get();
    expect(applied).toEqual({ id: "013_admin_push_locale" });
  });
});
