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
  getRequestHost,
  getRequestURL,
  getRouterParam,
  readBody,
  setCookie,
  toPlainHandler,
  type EventHandler,
} from "h3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { vi } from "vitest";
import type { Database as DatabaseType } from "better-sqlite3";
import { requestWithCookies, type ApiRequest, type CookieJar } from "./http-client";

export type { CookieJar, RequestOptions } from "./http-client";
export type ApiClient = {
  mainDb: DatabaseType;
  adminDb: DatabaseType;
  request: ApiRequest;
  loginAs: (username: string, password: string) => Promise<CookieJar>;
  close: () => void;
};

/** [method, route, handler module relative to the project root] */
export type Route = [string, string, string];

function installH3Globals() {
  Object.assign(globalThis, {
    createError,
    defineEventHandler,
    deleteCookie,
    getCookie,
    getHeader,
    getMethod,
    getQuery,
    getRequestHost,
    getRequestURL,
    getRouterParam,
    readBody,
    setCookie,
    useRuntimeConfig: () => ({ public: { appVersion: "9.9.9" } }),
  });
}

/**
 * Real handlers and middleware on fresh SQLite files in a temp directory.
 * Users: admin/admin1234 and planner/planner1234.
 */
export async function createApiClient(
  routes: Route[],
  seed?: (mainDb: DatabaseType) => void,
  defaultHeaders?: Record<string, string>
): Promise<ApiClient> {
  const originalCwd = process.cwd();
  const originalPassword = process.env.SHIFTPLAN_ADMIN_PASSWORD;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "shiftplan-api-"));
  process.chdir(tempDir);
  process.env.SHIFTPLAN_ADMIN_PASSWORD = "BootstrapPass1";
  vi.resetModules();
  installH3Globals();

  const root = path.resolve(__dirname, "../..");
  const load = async (modulePath: string) => (await import(path.join(root, modulePath))).default as EventHandler;

  const databaseModule = await import(path.join(root, "server/utils/database"));
  const mainDb = databaseModule.getDatabase();
  const adminDb = databaseModule.getAdminDatabase();
  adminDb.prepare("DELETE FROM users").run();
  const insertUser = adminDb.prepare(
    "INSERT INTO users (username, password_hash, role, active, created_at) VALUES (?, ?, ?, 1, datetime('now'))"
  );
  insertUser.run("admin", bcrypt.hashSync("admin1234", 8), "admin");
  insertUser.run("planner", bcrypt.hashSync("planner1234", 8), "planner");
  seed?.(mainDb);

  const router = createRouter();
  for (const [method, route, modulePath] of routes) {
    (router as any)[method](route, await load(modulePath));
  }
  const app = createApp();
  app.use(await load("server/middleware/auth"));
  app.use(router.handler);
  const request = requestWithCookies(toPlainHandler(app), defaultHeaders);

  return {
    mainDb,
    adminDb,
    request,
    async loginAs(username, password) {
      const jar: CookieJar = new Map();
      const response = await request("POST", "/api/auth/login", { jar, body: { username, password } });
      if (response.status !== 200) throw new Error(`login failed: ${response.status}`);
      return jar;
    },
    close() {
      databaseModule.closeDatabase();
      process.chdir(originalCwd);
      if (originalPassword === undefined) delete process.env.SHIFTPLAN_ADMIN_PASSWORD;
      else process.env.SHIFTPLAN_ADMIN_PASSWORD = originalPassword;
      vi.resetModules();
      fs.rmSync(tempDir, { recursive: true, force: true });
    },
  };
}
