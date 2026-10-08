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
  type PlainHandler,
  type PlainResponse,
} from "h3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { vi } from "vitest";
import type { Database as DatabaseType } from "better-sqlite3";
import backendConfig from "../../config/backend.config.json";

export type CookieJar = Map<string, string>;
export type RequestOptions = {
  body?: unknown;
  jar?: CookieJar;
  csrf?: boolean;
  headers?: Record<string, string>;
};
export type ApiClient = {
  mainDb: DatabaseType;
  adminDb: DatabaseType;
  request: <T = any>(method: string, path: string, options?: RequestOptions) => Promise<PlainResponse & { json: T | null }>;
  loginAs: (username: string, password: string) => Promise<CookieJar>;
  close: () => void;
};

/** [method, route, handler module relative to the project root] */
export type Route = [string, string, string];

const csrfCookieName = backendConfig.auth.session.cookies.csrfName;

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

function parseBody(body: unknown) {
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
  for (const [name, header] of response.headers) {
    if (name.toLowerCase() !== "set-cookie") continue;
    const [pair] = header.split(";");
    const separator = pair?.indexOf("=") ?? -1;
    if (!pair || separator === -1) continue;
    jar.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
}

function requestWithCookies(handler: PlainHandler): ApiClient["request"] {
  return async (method, requestPath, options = {}) => {
    const headers: Record<string, string> = { ...options.headers };
    if (options.jar && options.jar.size > 0) {
      headers.cookie = [...options.jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
    }
    if (options.body !== undefined) headers["content-type"] = "application/json";
    if (options.csrf && options.jar?.get(csrfCookieName)) {
      headers["x-csrf-token"] = options.jar.get(csrfCookieName)!;
    }
    const response = await handler({
      method,
      path: requestPath,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    updateCookieJar(options.jar, response);
    return { ...response, json: parseBody(response.body) };
  };
}

/**
 * Real handlers and middleware on fresh SQLite files in a temp directory.
 * Users: admin/admin1234 and planner/planner1234.
 */
export async function createApiClient(routes: Route[], seed?: (mainDb: DatabaseType) => void): Promise<ApiClient> {
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
  const request = requestWithCookies(toPlainHandler(app));

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
