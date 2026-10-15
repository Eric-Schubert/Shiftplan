import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterAll, describe, expect, it } from "vitest";
import backendConfig from "../config/backend.config.json";

const dirs: string[] = [];

// Runs setup.js against a fresh database folder and counts the seeded rows.
function runSetup(env: Record<string, string> = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shiftplan-setup-"));
  dirs.push(dir);
  const configPath = path.join(dir, "backend.config.json");
  const database = { ...backendConfig.database, directory: path.join(dir, "db") };
  fs.writeFileSync(configPath, JSON.stringify({ ...backendConfig, database }));

  const childEnv: NodeJS.ProcessEnv = { ...process.env };
  delete childEnv.SHIFTPLAN_SEED_DEMO_DATA;
  delete childEnv.NUXT_PUBLIC_DEMO_LOGIN_USERNAME;
  Object.assign(childEnv, {
    SHIFTPLAN_ADMIN_PASSWORD: "SetupTestPass1",
    SHIFTPLAN_BACKEND_CONFIG_PATH: configPath,
    ...env,
  });
  execFileSync("node", ["setup.js"], { env: childEnv, stdio: "pipe" });

  const db = new Database(path.join(database.directory, database.mainFile), { readonly: true });
  const count = (table: string) =>
    (db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count;
  const result = { staff: count("staff"), shifts: count("shifts") };
  db.close();
  return result;
}

afterAll(() => {
  for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
});

describe("setup.js sample data", () => {
  it("starts a new instance without staff and shifts", () => {
    expect(runSetup()).toEqual({ staff: 0, shifts: 0 });
  });

  it("seeds sample data with SHIFTPLAN_SEED_DEMO_DATA=true", () => {
    expect(runSetup({ SHIFTPLAN_SEED_DEMO_DATA: "true" })).toEqual({ staff: 5, shifts: 3 });
  });

  it("seeds sample data on a public demo", () => {
    expect(runSetup({ NUXT_PUBLIC_DEMO_LOGIN_USERNAME: "admin" })).toEqual({ staff: 5, shifts: 3 });
  });
});
