import bcrypt from "bcryptjs";
import {
  createApp,
  createError,
  createRouter,
  defineEventHandler,
  deleteCookie,
  getCookie,
  getHeader,
  getMethod,
  getQuery,
  getRequestURL,
  readBody,
  setCookie,
  toPlainHandler,
  type EventHandler,
  type PlainHandler,
  type PlainResponse,
} from "h3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Database as DatabaseType } from "better-sqlite3";

type ApiClient = {
  mainDb: DatabaseType;
  adminDb: DatabaseType;
  request: <T = any>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      jar?: CookieJar;
      csrf?: boolean;
      headers?: Record<string, string>;
    },
  ) => Promise<PlainResponse & { json: T | null }>;
};

type CookieJar = Map<string, string>;

const originalCwd = process.cwd();
const originalBootstrapPassword = process.env.SHIFTPLAN_ADMIN_PASSWORD;
let tempDir: string | null = null;
let closeDatabase: (() => void) | null = null;
let client: ApiClient;

function installH3Globals() {
  Object.assign(globalThis, {
    createError,
    defineEventHandler,
    deleteCookie,
    getCookie,
    getHeader,
    getMethod,
    getQuery,
    getRequestURL,
    readBody,
    setCookie,
  });
}

async function loadHandler(importPath: string): Promise<EventHandler> {
  const module = await import(importPath);
  return module.default as EventHandler;
}

function parseBody(body: unknown) {
  if (typeof body === "object" && body !== null && !Buffer.isBuffer(body)) return body;

  const text = Buffer.isBuffer(body) ? body.toString("utf-8") : body;
  if (typeof text !== "string" || text.length === 0) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function updateCookieJar(jar: CookieJar | undefined, response: PlainResponse) {
  if (!jar) return;

  const setCookies = response.headers
    .filter(([name]) => name.toLowerCase() === "set-cookie")
    .map(([, value]) => value);

  for (const header of setCookies) {
    const [pair] = header.split(";");
    if (!pair) continue;

    const separator = pair.indexOf("=");
    if (separator === -1) continue;

    const name = pair.slice(0, separator);
    const value = pair.slice(separator + 1);

    if (header.toLowerCase().includes("max-age=0")) {
      jar.delete(name);
    } else {
      jar.set(name, value);
    }
  }
}

function cookieHeader(jar?: CookieJar) {
  if (!jar || jar.size === 0) return undefined;
  return [...jar.entries()]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

async function createApiClient(): Promise<ApiClient> {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "shiftplan-auth-e2e-"));
  process.chdir(tempDir);
  process.env.SHIFTPLAN_ADMIN_PASSWORD = "BootstrapPass1";
  vi.resetModules();
  installH3Globals();

  const databaseModule = await import("../server/utils/database");
  closeDatabase = databaseModule.closeDatabase;

  const mainDb = databaseModule.getDatabase();
  const adminDb = databaseModule.getAdminDatabase();
  seedMainDatabase(mainDb);
  seedAdminDatabase(adminDb);

  const [
    authMiddleware,
    loginPost,
    sessionGet,
    logoutPost,
    usersPost,
    staffPost,
    shiftplanGet,
    shiftplanAssignPost,
    shiftplanUnassignPost,
  ] = await Promise.all([
    loadHandler("../server/middleware/auth"),
    loadHandler("../server/api/auth/login.post"),
    loadHandler("../server/api/auth/session.get"),
    loadHandler("../server/api/auth/logout.post"),
    loadHandler("../server/api/auth/users.post"),
    loadHandler("../server/api/staff/index.post"),
    loadHandler("../server/api/shiftplan/index.get"),
    loadHandler("../server/api/shiftplan/assign.post"),
    loadHandler("../server/api/shiftplan/unassign.post"),
  ]);

  const app = createApp();
  const router = createRouter()
    .post("/api/auth/login", loginPost)
    .get("/api/auth/session", sessionGet)
    .post("/api/auth/logout", logoutPost)
    .post("/api/auth/users", usersPost)
    .post("/api/staff", staffPost)
    .get("/api/shiftplan", shiftplanGet)
    .post("/api/shiftplan/assign", shiftplanAssignPost)
    .post("/api/shiftplan/unassign", shiftplanUnassignPost);

  app.use(authMiddleware);
  app.use(router.handler);

  const handler = toPlainHandler(app);

  return {
    mainDb,
    adminDb,
    request: requestWithCookies(handler),
  };
}

function requestWithCookies(handler: PlainHandler): ApiClient["request"] {
  return async (method, requestPath, options = {}) => {
    const headers: Record<string, string> = {
      "x-forwarded-for": "127.0.0.1",
      ...options.headers,
    };
    const cookie = cookieHeader(options.jar);

    if (cookie) headers.cookie = cookie;
    if (options.body !== undefined) headers["content-type"] = "application/json";
    if (options.csrf && options.jar?.get("csrf_token")) {
      headers["x-csrf-token"] = options.jar.get("csrf_token")!;
    }

    const response = await handler({
      method,
      path: requestPath,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    updateCookieJar(options.jar, response);

    return {
      ...response,
      json: parseBody(response.body),
    };
  };
}

function seedMainDatabase(db: DatabaseType) {
  db.prepare("INSERT INTO staff (name, active, is_parttime) VALUES (?, 1, 0)")
    .run("Planner Test Staff");
  db.prepare(`
    INSERT INTO shifts (name, active, start_time, end_time, color, min_staff, sort_order)
    VALUES (?, 1, ?, ?, ?, 1, 1)
  `).run("Planner Test Shift", "06:00", "14:00", "#22c55e");
  db.prepare(`
    INSERT OR IGNORE INTO rotation_config (config_id, cycle_length, start_year, start_week)
    VALUES (1, 4, 2026, 1)
  `).run();
}

function seedAdminDatabase(db: DatabaseType) {
  db.prepare("DELETE FROM users").run();
  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, role, active, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `);

  insertUser.run("admin", bcrypt.hashSync("admin1234", 8), "admin", 1);
  insertUser.run("planner", bcrypt.hashSync("planner1234", 8), "planner", 1);
  insertUser.run("disabled", bcrypt.hashSync("disabled1234", 8), "planner", 0);
}

async function loginAs(
  client: ApiClient,
  username: string,
  password: string,
): Promise<CookieJar> {
  const jar = new Map<string, string>();
  const response = await client.request("POST", "/api/auth/login", {
    jar,
    body: { username, password },
  });

  expect(response.status).toBe(200);
  return jar;
}

describe("auth and planner e2e", () => {
  beforeEach(async () => {
    client = await createApiClient();
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

  it("logs in with user credentials without exposing session tokens", async () => {
    const jar = new Map<string, string>();

    const login = await client.request<{
      success: boolean;
      user: { username: string; role: string };
      token?: string;
      sessionToken?: string;
    }>("POST", "/api/auth/login", {
      jar,
      body: { username: "planner", password: "planner1234" },
    });

    expect(login.status).toBe(200);
    expect(login.json).toMatchObject({
      success: true,
      user: { username: "planner", role: "planner" },
    });
    expect(login.json?.token).toBeUndefined();
    expect(login.json?.sessionToken).toBeUndefined();
    expect(jar.get("session_token")).toBeTruthy();
    expect(jar.get("csrf_token")).toBeTruthy();

    const session = await client.request<{
      authenticated: boolean;
      user: { username: string; role: string };
      csrfToken: string;
    }>("GET", "/api/auth/session", { jar });

    expect(session.status).toBe(200);
    expect(session.json).toMatchObject({
      authenticated: true,
      user: { username: "planner", role: "planner" },
      csrfToken: jar.get("csrf_token"),
    });
  });

  it("rejects inactive users and invalid credentials", async () => {
    const disabled = await client.request("POST", "/api/auth/login", {
      body: { username: "disabled", password: "disabled1234" },
      headers: { "x-forwarded-for": "127.0.0.2" },
    });
    const invalid = await client.request("POST", "/api/auth/login", {
      body: { username: "planner", password: "wrong-password" },
      headers: { "x-forwarded-for": "127.0.0.3" },
    });

    expect(disabled.status).toBe(401);
    expect(invalid.status).toBe(401);
  });

  it("keeps public reads open while blocking unauthenticated mutations", async () => {
    const publicPlan = await client.request<{
      week: { week_id: number; year: number; week_number: number };
    }>("GET", "/api/shiftplan?year=2026&week=12");
    const weekCount = client.mainDb
      .prepare("SELECT COUNT(*) AS count FROM weeks")
      .get() as { count: number };
    const mutation = await client.request("POST", "/api/shiftplan/assign", {
      body: { staff_id: 1, shift_id: 1, year: 2026, week: 12 },
    });

    expect(publicPlan.status).toBe(200);
    expect(publicPlan.json?.week).toMatchObject({
      week_id: 0,
      year: 2026,
      week_number: 12,
    });
    expect(weekCount.count).toBe(0);
    expect(mutation.status).toBe(401);
  });

  it("requires a valid csrf token for authenticated mutations", async () => {
    const jar = await loginAs(client, "planner", "planner1234");

    const missingCsrf = await client.request("POST", "/api/shiftplan/assign", {
      jar,
      body: { staff_id: 1, shift_id: 1, year: 2026, week: 13 },
    });

    const invalidCsrf = await client.request("POST", "/api/shiftplan/assign", {
      jar,
      headers: { "x-csrf-token": "invalid-token" },
      body: { staff_id: 1, shift_id: 1, year: 2026, week: 13 },
    });

    expect(missingCsrf.status).toBe(403);
    expect(invalidCsrf.status).toBe(403);
  });

  it("allows planner shift assignments but blocks admin-only endpoints", async () => {
    const jar = await loginAs(client, "planner", "planner1234");

    const forbiddenStaffCreate = await client.request("POST", "/api/staff", {
      jar,
      csrf: true,
      body: { name: "Should Not Exist", active: 1, is_parttime: 0 },
    });
    const assign = await client.request("POST", "/api/shiftplan/assign", {
      jar,
      csrf: true,
      body: { staff_id: 1, shift_id: 1, year: 2026, week: 14 },
    });
    const assigned = client.mainDb
      .prepare(`
        SELECT COUNT(*) AS count
        FROM shift_assignments sa
        JOIN weeks w ON w.week_id = sa.week_id
        WHERE sa.staff_id = 1 AND sa.shift_id = 1 AND w.year = 2026 AND w.week_number = 14
      `)
      .get() as { count: number };
    const publicPlan = await client.request<{
      shifts: Array<{ assigned_staff: Array<{ name: string }> }>;
    }>("GET", "/api/shiftplan?year=2026&week=14");
    const unassign = await client.request("POST", "/api/shiftplan/unassign", {
      jar,
      csrf: true,
      body: { staff_id: 1, shift_id: 1, year: 2026, week: 14 },
    });
    const remaining = client.mainDb
      .prepare("SELECT COUNT(*) AS count FROM shift_assignments")
      .get() as { count: number };
    const auditEntries = client.mainDb
      .prepare(`
        SELECT username, action, year, week_number, shift_name, staff_name
        FROM audit_log
        ORDER BY audit_id ASC
      `)
      .all();

    expect(forbiddenStaffCreate.status).toBe(403);
    expect(assign.status).toBe(200);
    expect(assign.json).toEqual({ success: true });
    expect(assigned.count).toBe(1);
    expect(publicPlan.status).toBe(200);
    expect(publicPlan.json?.shifts[0]?.assigned_staff).toEqual([
      expect.objectContaining({ name: "Planner Test Staff" }),
    ]);
    expect(unassign.status).toBe(200);
    expect(unassign.json).toEqual({ success: true });
    expect(remaining.count).toBe(0);
    expect(auditEntries).toEqual([
      {
        username: "planner",
        action: "assign",
        year: 2026,
        week_number: 14,
        shift_name: "Planner Test Shift",
        staff_name: "Planner Test Staff",
      },
      {
        username: "planner",
        action: "unassign",
        year: 2026,
        week_number: 14,
        shift_name: "Planner Test Shift",
        staff_name: "Planner Test Staff",
      },
    ]);
  });

  it("allows admins to create planner users", async () => {
    const jar = await loginAs(client, "admin", "admin1234");

    const created = await client.request<{
      success: boolean;
      username: string;
      role: string;
    }>("POST", "/api/auth/users", {
      jar,
      csrf: true,
      body: { username: "newplanner", password: "Newplanner1234", role: "planner" },
    });
    const user = client.adminDb
      .prepare("SELECT username, role, active FROM users WHERE username = ?")
      .get("newplanner");

    expect(created.status).toBe(200);
    expect(created.json).toMatchObject({
      success: true,
      username: "newplanner",
      role: "planner",
    });
    expect(user).toMatchObject({
      username: "newplanner",
      role: "planner",
      active: 1,
    });
  });

  it("rejects weak passwords when admins create users", async () => {
    const jar = await loginAs(client, "admin", "admin1234");

    const created = await client.request("POST", "/api/auth/users", {
      jar,
      csrf: true,
      body: { username: "weakplanner", password: "weakpass1", role: "planner" },
    });
    const user = client.adminDb
      .prepare("SELECT username FROM users WHERE username = ?")
      .get("weakplanner");

    expect(created.status).toBe(400);
    expect(user).toBeUndefined();
  });
});
