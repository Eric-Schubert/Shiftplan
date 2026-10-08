import bcrypt from "bcryptjs";
import { afterEach, beforeEach } from "vitest";
import backendConfig from "../../config/backend.config.json";
import { createApiClient, type ApiClient, type Route } from "./api-harness";

const ROUTES: Route[] = [
  ["post", "/api/auth/login", "server/api/auth/login.post"],
  ["get", "/api/auth/session", "server/api/auth/session.get"],
  ["post", "/api/auth/logout", "server/api/auth/logout.post"],
  ["post", "/api/auth/users", "server/api/auth/users.post"],
  ["post", "/api/staff", "server/api/staff/index.post"],
  ["get", "/api/shiftplan", "server/api/shiftplan/index.get"],
  ["post", "/api/shiftplan/assign", "server/api/shiftplan/assign.post"],
  ["post", "/api/shiftplan/unassign", "server/api/shiftplan/unassign.post"],
];

export const sessionCookieName = backendConfig.auth.session.cookies.sessionName;
export const csrfCookieName = backendConfig.auth.session.cookies.csrfName;

/** The client of the running test. */
export let client: ApiClient;

/**
 * Fresh databases for every test with one staff member and one shift.
 * Users: admin, planner and the inactive disabled/disabled1234.
 */
export function useAuthClient() {
  beforeEach(async () => {
    client = await createApiClient(
      ROUTES,
      (db) => {
        db.prepare("INSERT INTO staff (name, active, is_parttime) VALUES (?, 1, 0)").run("Planner Test Staff");
        db.prepare(`
          INSERT INTO shifts (name, active, start_time, end_time, color, min_staff, sort_order)
          VALUES (?, 1, ?, ?, ?, 1, 1)
        `).run("Planner Test Shift", "06:00", "14:00", "#22c55e");
        db.prepare(`
          INSERT OR IGNORE INTO rotation_config (config_id, cycle_length, start_year, start_week)
          VALUES (1, 4, 2026, 1)
        `).run();
      },
      { "x-forwarded-for": "127.0.0.1" }
    );
    client.adminDb
      .prepare(
        "INSERT INTO users (username, password_hash, role, active, created_at) VALUES (?, ?, 'planner', 0, datetime('now'))"
      )
      .run("disabled", bcrypt.hashSync("disabled1234", 8));
  });

  afterEach(() => {
    client.close();
  });
}
