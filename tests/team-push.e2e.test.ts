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
import backendConfig from "../config/backend.config.json";

const sendNotification = vi.fn();

vi.mock("web-push", () => ({
  default: {
    generateVAPIDKeys: () => ({ publicKey: "test-public-key", privateKey: "test-private-key" }),
    sendNotification: (...args: unknown[]) => sendNotification(...args),
  },
}));

const relayFetch = vi.fn();
process.env.SHIFTPLAN_PUSH_RELAY_URL = "https://relay.test";
vi.stubGlobal("fetch", (...args: unknown[]) => relayFetch(...args));

const csrfCookieName = backendConfig.auth.session.cookies.csrfName;
const FCM_ENDPOINT = "https://fcm.googleapis.com/fcm/send/device-1";
const APPLE_ENDPOINT = "https://web.push.apple.com/device-2";
const KEYS = { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQ", auth: "tBHItJI5svbpez7KI4CCXg" };

type CookieJar = Map<string, string>;
type RequestOptions = {
  body?: unknown;
  jar?: CookieJar;
  csrf?: boolean;
  headers?: Record<string, string>;
};
type ApiClient = {
  mainDb: DatabaseType;
  adminDb: DatabaseType;
  push: typeof import("../server/services/push.service");
  request: <T = any>(
    method: string,
    path: string,
    options?: RequestOptions,
  ) => Promise<PlainResponse & { json: T | null }>;
};

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
    useRuntimeConfig: () => ({ public: { appVersion: "9.9.9" } }),
  });
}

async function loadHandler(importPath: string): Promise<EventHandler> {
  const module = await import(importPath);
  return module.default as EventHandler;
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

async function createApiClient(): Promise<ApiClient> {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "shiftplan-team-push-"));
  process.chdir(tempDir);
  process.env.SHIFTPLAN_ADMIN_PASSWORD = "BootstrapPass1";
  vi.resetModules();
  installH3Globals();

  const databaseModule = await import("../server/utils/database");
  closeDatabase = databaseModule.closeDatabase;
  const mainDb = databaseModule.getDatabase();
  const adminDb = databaseModule.getAdminDatabase();

  mainDb.prepare("INSERT INTO staff (name, active, is_parttime) VALUES (?, 1, 0)").run("Anna");
  mainDb.prepare("INSERT INTO staff (name, active, is_parttime) VALUES (?, 1, 0)").run("Max");
  mainDb.prepare(`
    INSERT INTO shifts (name, active, start_time, end_time, color, min_staff, sort_order)
    VALUES ('Frühschicht', 1, '06:00', '14:00', '#22c55e', 1, 1)
  `).run();
  adminDb.prepare("DELETE FROM users").run();
  const insertUser = adminDb.prepare(`
    INSERT INTO users (username, password_hash, role, active, created_at)
    VALUES (?, ?, ?, 1, datetime('now'))
  `);
  insertUser.run("admin", bcrypt.hashSync("admin1234", 8), "admin");
  insertUser.run("planner", bcrypt.hashSync("planner1234", 8), "planner");

  const routes: Array<[string, string, string]> = [
    ["post", "/api/auth/login", "../server/api/auth/login.post"],
    ["get", "/api/shiftplan", "../server/api/shiftplan/index.get"],
    ["post", "/api/shiftplan/assign", "../server/api/shiftplan/assign.post"],
    ["post", "/api/shiftplan/unassign", "../server/api/shiftplan/unassign.post"],
    ["get", "/api/instance", "../server/api/instance.get"],
    ["post", "/api/viewer/login", "../server/api/viewer/login.post"],
    ["post", "/api/viewer/logout", "../server/api/viewer/logout.post"],
    ["post", "/api/push/devices", "../server/api/push/devices.post"],
    ["delete", "/api/push/devices", "../server/api/push/devices.delete"],
    ["get", "/api/viewer/status", "../server/api/viewer/status.get"],
    ["post", "/api/push/subscribe", "../server/api/push/subscribe.post"],
    ["post", "/api/push/unsubscribe", "../server/api/push/unsubscribe.post"],
    ["get", "/api/push/status", "../server/api/push/status.get"],
    ["post", "/api/push/notify", "../server/api/push/notify.post"],
    ["get", "/api/team-access", "../server/api/team-access/index.get"],
    ["post", "/api/team-access", "../server/api/team-access/index.post"],
  ];

  const router = createRouter();
  for (const [method, route, importPath] of routes) {
    (router as any)[method](route, await loadHandler(importPath));
  }

  const app = createApp();
  app.use(await loadHandler("../server/middleware/auth"));
  app.use(router.handler);

  return {
    mainDb,
    adminDb,
    push: await import("../server/services/push.service"),
    request: requestWithCookies(toPlainHandler(app)),
  };
}

async function loginAs(username: string, password: string): Promise<CookieJar> {
  const jar: CookieJar = new Map();
  const response = await client.request("POST", "/api/auth/login", {
    jar,
    body: { username, password },
  });
  expect(response.status).toBe(200);
  return jar;
}

function currentWeek() {
  return client.push.getNotifiableWeeks()[0]!;
}

describe("team access and push e2e", () => {
  beforeEach(async () => {
    sendNotification.mockReset();
    sendNotification.mockResolvedValue({ statusCode: 201 });
    client = await createApiClient();
  });

  afterEach(async () => {
    await client.push.PushService.flushPendingChanges();
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

  it("keeps the plan public and allows push subscriptions while no code is set", async () => {
    const status = await client.request("GET", "/api/viewer/status");
    const plan = await client.request("GET", "/api/shiftplan?year=2026&week=12");
    const subscribe = await client.request("POST", "/api/push/subscribe", {
      body: { endpoint: FCM_ENDPOINT, keys: KEYS },
    });

    expect(status.json).toEqual({
      codeRequired: false,
      hasAccess: true,
      pushPublicKey: "test-public-key",
    });
    expect(plan.status).toBe(200);
    expect(subscribe.status).toBe(200);
    expect(client.push.PushService.countSubscriptions()).toBe(1);
  });

  it("rejects push endpoints that are not real push services", async () => {
    for (const endpoint of [
      "http://fcm.googleapis.com/fcm/send/x",
      "https://192.168.178.130/internal",
      "https://evil.example/web.push.apple.com",
    ]) {
      const response = await client.request("POST", "/api/push/subscribe", {
        body: { endpoint, keys: KEYS },
      });
      expect(response.status).toBe(400);
    }
    expect(client.push.PushService.countSubscriptions()).toBe(0);
  });

  it("protects the plan behind the access code and lets employees in with it", async () => {
    const admin = await loginAs("admin", "admin1234");
    const created = await client.request<{ code: string }>("POST", "/api/team-access", {
      jar: admin,
      csrf: true,
      body: { generate: true },
    });
    const code = created.json!.code;

    const anonymousPlan = await client.request("GET", "/api/shiftplan?year=2026&week=12");
    const anonymousStatus = await client.request("GET", "/api/viewer/status");
    const anonymousSubscribe = await client.request("POST", "/api/push/subscribe", {
      body: { endpoint: FCM_ENDPOINT, keys: KEYS },
    });
    const wrongCode = await client.request("POST", "/api/viewer/login", {
      body: { code: "WRONGCODE" },
    });

    const viewer: CookieJar = new Map();
    const login = await client.request("POST", "/api/viewer/login", {
      jar: viewer,
      body: { code: ` ${code.toLowerCase()} ` },
    });
    const viewerPlan = await client.request("GET", "/api/shiftplan?year=2026&week=12", { jar: viewer });
    const viewerAssign = await client.request("POST", "/api/shiftplan/assign", {
      jar: viewer,
      body: { staff_id: 1, shift_id: 1, year: 2026, week: 12 },
    });
    const plannerPlan = await client.request("GET", "/api/shiftplan?year=2026&week=12", {
      jar: await loginAs("planner", "planner1234"),
    });

    expect(code).toMatch(/^[A-Z2-9]{8}$/);
    expect(anonymousPlan.status).toBe(401);
    expect(anonymousStatus.json).toEqual({ codeRequired: true, hasAccess: false, pushPublicKey: null });
    expect(anonymousSubscribe.status).toBe(401);
    expect(wrongCode.status).toBe(401);
    expect(login.status).toBe(200);
    expect(viewer.get("viewer_token")).toBeTruthy();
    expect(viewerPlan.status).toBe(200);
    expect(viewerAssign.status).toBe(401);
    expect(plannerPlan.status).toBe(200);
  });

  it("keeps planner logins open after mistyped team codes from the same network", async () => {
    const admin = await loginAs("admin", "admin1234");
    await client.request("POST", "/api/team-access", { jar: admin, csrf: true, body: { generate: true } });

    for (let attempt = 0; attempt < backendConfig.auth.loginRateLimit.maxAttempts; attempt += 1) {
      await client.request("POST", "/api/viewer/login", { body: { code: "WRONGCODE" } });
    }
    const blockedViewer = await client.request("POST", "/api/viewer/login", { body: { code: "WRONGCODE" } });

    expect(blockedViewer.status).toBe(429);
    await loginAs("planner", "planner1234");
  });

  it("signs out employee devices and drops subscriptions when the code changes", async () => {
    const admin = await loginAs("admin", "admin1234");
    await client.request("POST", "/api/team-access", { jar: admin, csrf: true, body: { code: "Team-2026" } });

    const viewer: CookieJar = new Map();
    await client.request("POST", "/api/viewer/login", { jar: viewer, body: { code: "team-2026" } });
    await client.request("POST", "/api/push/subscribe", {
      jar: viewer,
      body: { endpoint: APPLE_ENDPOINT, keys: KEYS },
    });
    expect(client.push.PushService.countSubscriptions()).toBe(1);

    await client.request("POST", "/api/team-access", { jar: admin, csrf: true, body: { code: "Neu-2026" } });
    const afterRotation = await client.request("GET", "/api/shiftplan?year=2026&week=12", { jar: viewer });

    expect(afterRotation.status).toBe(401);
    expect(client.push.PushService.countSubscriptions()).toBe(0);

    const removed = await client.request("POST", "/api/team-access", { jar: admin, csrf: true, body: { code: null } });
    const publicAgain = await client.request("GET", "/api/shiftplan?year=2026&week=12");
    expect(removed.json).toEqual({ code: null });
    expect(publicAgain.status).toBe(200);
  });

  it("only lets admins manage the code and planners send team messages", async () => {
    const planner = await loginAs("planner", "planner1234");
    await client.request("POST", "/api/push/subscribe", { body: { endpoint: FCM_ENDPOINT, keys: KEYS } });
    await client.request("POST", "/api/push/subscribe", { body: { endpoint: APPLE_ENDPOINT, keys: KEYS } });
    sendNotification.mockImplementation(async (subscription: { endpoint: string }) => {
      if (subscription.endpoint === APPLE_ENDPOINT) throw Object.assign(new Error("gone"), { statusCode: 410 });
      return { statusCode: 201 };
    });

    const plannerManage = await client.request("POST", "/api/team-access", {
      jar: planner,
      csrf: true,
      body: { generate: true },
    });
    const anonymousNotify = await client.request("POST", "/api/push/notify", {
      body: { message: "Wer kann Samstag?" },
    });
    const status = await client.request("GET", "/api/push/status", { jar: planner });
    const notify = await client.request("POST", "/api/push/notify", {
      jar: planner,
      csrf: true,
      body: { message: "Wer kann Samstag einspringen?" },
    });

    expect(plannerManage.status).toBe(403);
    expect(anonymousNotify.status).toBe(401);
    expect(status.json).toEqual({ subscriberCount: 2 });
    expect(notify.json).toEqual({ sent: 1, failed: 1 });
    expect(JSON.parse(sendNotification.mock.calls[0]![1])).toEqual({
      title: "Nachricht vom Schichtplaner",
      body: "Wer kann Samstag einspringen?",
      url: "/",
    });
    expect(client.push.PushService.countSubscriptions()).toBe(1);
  });

  it("bundles changes in the current week into one push and ignores later weeks", async () => {
    const planner = await loginAs("planner", "planner1234");
    await client.request("POST", "/api/push/subscribe", { body: { endpoint: FCM_ENDPOINT, keys: KEYS } });
    const { year, week } = currentWeek();
    const post = (route: string, staffId: number, targetWeek = week) =>
      client.request("POST", route, {
        jar: planner,
        csrf: true,
        body: { staff_id: staffId, shift_id: 1, year, week: targetWeek },
      });

    await post("/api/shiftplan/assign", 1);
    await client.push.PushService.flushPendingChanges();
    sendNotification.mockClear();

    await post("/api/shiftplan/unassign", 1);
    await post("/api/shiftplan/assign", 2);
    await post("/api/shiftplan/assign", 1, week >= 50 ? 1 : week + 5);
    const result = await client.push.PushService.flushPendingChanges();

    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(sendNotification).toHaveBeenCalledTimes(1);
    expect(JSON.parse(sendNotification.mock.calls[0]![1])).toEqual({
      title: "Schichtplan geändert",
      body: `KW ${week} · Frühschicht: neu: Max / entfällt: Anna`,
      url: `/?year=${year}&week=${week}`,
    });
  });

  it("does not push changes that cancel each other out", async () => {
    const planner = await loginAs("planner", "planner1234");
    await client.request("POST", "/api/push/subscribe", { body: { endpoint: FCM_ENDPOINT, keys: KEYS } });
    const { year, week } = currentWeek();
    const body = { staff_id: 1, shift_id: 1, year, week };

    await client.request("POST", "/api/shiftplan/assign", { jar: planner, csrf: true, body });
    await client.request("POST", "/api/shiftplan/unassign", { jar: planner, csrf: true, body });

    expect(await client.push.PushService.flushPendingChanges()).toBeNull();
    expect(sendNotification).not.toHaveBeenCalled();
  });
});

describe("push helpers", () => {
  it("treats the turn of the year as current and next week", async () => {
    vi.resetModules();
    const { getNotifiableWeeks } = await import("../server/services/push.service");

    expect(getNotifiableWeeks(new Date("2026-12-30T12:00:00Z"))).toEqual([
      { year: 2026, week: 53 },
      { year: 2027, week: 1 },
    ]);
    expect(getNotifiableWeeks(new Date("2026-10-04T23:30:00Z"))).toEqual([
      { year: 2026, week: 41 },
      { year: 2026, week: 42 },
    ]);
  });

  it("shortens long change lists", async () => {
    vi.resetModules();
    const { buildChangePayload } = await import("../server/services/push.service");
    const changes = Array.from({ length: 6 }, (_, index) => ({
      year: 2026,
      week: 41,
      shiftName: `Schicht ${index + 1}`,
      shiftOrder: index,
      staffId: 1,
      staffName: "Anna",
      delta: 1,
    }));

    const payload = buildChangePayload(changes)!;
    expect(payload.body.split("\n")).toHaveLength(5);
    expect(payload.body).toContain("… und 2 weitere Änderungen");
  });
});

describe("app api e2e", () => {
  const FCM_TOKEN = "dGVzdC1kZXZpY2U:APA91bH-test_token";

  beforeEach(async () => {
    sendNotification.mockReset();
    relayFetch.mockReset();
    relayFetch.mockRejectedValue(new Error("unexpected network call"));
    client = await createApiClient();
  });

  afterEach(() => {
    closeDatabase?.();
    closeDatabase = null;
    process.chdir(originalCwd);
    vi.resetModules();
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  async function enableCode(): Promise<string> {
    const admin = await loginAs("admin", "admin1234");
    const created = await client.request<{ code: string }>("POST", "/api/team-access", {
      jar: admin,
      csrf: true,
      body: { generate: true },
    });
    await client.request("POST", "/api/team-access", {
      jar: admin,
      csrf: true,
      body: { instanceName: "Pflegeteam Nord" },
    });
    return created.json!.code;
  }

  async function appLogin(code: string): Promise<Record<string, string>> {
    const login = await client.request<{ token: string; expiresAt: number }>("POST", "/api/viewer/login", {
      body: { code, client: "app" },
    });
    expect(login.status).toBe(200);
    expect(login.headers.some(([name]) => name.toLowerCase() === "set-cookie")).toBe(false);
    return { authorization: `Bearer ${login.json!.token}` };
  }

  it("describes the instance for the app", async () => {
    const before = await client.request("GET", "/api/instance");
    await enableCode();
    const after = await client.request("GET", "/api/instance");

    expect(before.json).toEqual({
      instanceId: expect.stringMatching(/^[A-Za-z0-9_-]{16}$/),
      name: "Schichtplaner",
      version: "9.9.9",
      apiVersion: 1,
      codeRequired: false,
    });
    expect(after.json).toMatchObject({ name: "Pflegeteam Nord", codeRequired: true });
    expect(after.json.instanceId).toBe(before.json.instanceId);
  });

  it("reads the plan with a bearer token and signs out again", async () => {
    const headers = await appLogin(await enableCode());

    const plan = await client.request("GET", "/api/shiftplan?year=2026&week=12", { headers });
    const status = await client.request("GET", "/api/viewer/status", { headers });
    const logout = await client.request("POST", "/api/viewer/logout", { headers });
    const afterLogout = await client.request("GET", "/api/shiftplan?year=2026&week=12", { headers });
    const forged = await client.request("GET", "/api/shiftplan?year=2026&week=12", {
      headers: { authorization: "Bearer not-a-token" },
    });

    expect(plan.status).toBe(200);
    expect(status.json).toMatchObject({ codeRequired: true, hasAccess: true });
    expect(logout.status).toBe(200);
    expect(afterLogout.status).toBe(401);
    expect(forged.status).toBe(401);
  });

  it("registers app devices and removes them with a new code", async () => {
    const headers = await appLogin(await enableCode());
    const devices = () =>
      client.adminDb.prepare("SELECT platform, token, staff_id, scope FROM push_devices").all();

    const anonymous = await client.request("POST", "/api/push/devices", {
      body: { platform: "ios", token: FCM_TOKEN },
    });
    const registered = await client.request("POST", "/api/push/devices", {
      headers,
      body: { platform: "ios", token: FCM_TOKEN },
    });
    const updated = await client.request("POST", "/api/push/devices", {
      headers,
      body: { platform: "ios", token: FCM_TOKEN, staffId: 2, scope: "mine" },
    });

    expect(anonymous.status).toBe(401);
    expect(registered.status).toBe(200);
    expect(updated.status).toBe(200);
    expect(devices()).toEqual([{ platform: "ios", token: FCM_TOKEN, staff_id: 2, scope: "mine" }]);

    const admin = await loginAs("admin", "admin1234");
    await client.request("POST", "/api/team-access", { jar: admin, csrf: true, body: { generate: true } });
    expect(devices()).toEqual([]);
  });

  it("rejects invalid device registrations", async () => {
    const invalid = [
      { platform: "windows", token: FCM_TOKEN },
      { platform: "android", token: "has spaces" },
      { platform: "android", token: FCM_TOKEN, scope: "mine" },
      { platform: "android", token: FCM_TOKEN, staffId: 999 },
      { platform: "android", token: FCM_TOKEN, scope: "everything" },
    ];

    for (const body of invalid) {
      const response = await client.request("POST", "/api/push/devices", { body });
      expect(response.status).toBe(400);
    }

    await client.request("POST", "/api/push/devices", { body: { platform: "android", token: FCM_TOKEN } });
    await client.request("DELETE", "/api/push/devices", { body: { token: FCM_TOKEN } });
    expect(client.adminDb.prepare("SELECT COUNT(*) AS count FROM push_devices").get()).toEqual({ count: 0 });
  });
});

describe("push relay e2e", () => {
  const ALL = "token-all:APA91b";
  const MINE_MAX = "token-max:APA91b";
  const MINE_ANNA = "token-anna:APA91b";
  const MINE_OTHER = "token-other:APA91b";

  type RelayCall = { url: string; auth?: string; body: any };
  let calls: RelayCall[];
  let relayResponses: Array<(call: RelayCall) => Response>;

  function json(status: number, body: unknown) {
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  }

  beforeEach(async () => {
    sendNotification.mockReset();
    sendNotification.mockResolvedValue({ statusCode: 201 });
    calls = [];
    relayResponses = [];
    relayFetch.mockReset();
    relayFetch.mockImplementation(async (url: string, init: RequestInit) => {
      const headers = init.headers as Record<string, string>;
      const call = { url, auth: headers.authorization, body: JSON.parse(String(init.body)) };
      calls.push(call);
      const next = relayResponses.shift();
      if (next) return next(call);
      if (url.endsWith("/v1/instances")) return json(201, { instanceId: "inst_test", secret: "sk_test" });
      return json(200, { sent: call.body.tokens.length, failed: 0, invalidTokens: [] });
    });
    client = await createApiClient();
    client.mainDb.prepare("INSERT INTO staff (name, active, is_parttime) VALUES ('Olaf', 1, 0)").run();
  });

  afterEach(async () => {
    await client.push.PushService.flushPendingChanges();
    closeDatabase?.();
    closeDatabase = null;
    process.chdir(originalCwd);
    vi.resetModules();
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  async function registerDevices() {
    for (const body of [
      { platform: "android", token: ALL },
      { platform: "ios", token: MINE_MAX, staffId: 2, scope: "mine" },
      { platform: "ios", token: MINE_ANNA, staffId: 1, scope: "mine" },
      { platform: "android", token: MINE_OTHER, staffId: 3, scope: "mine" },
    ]) {
      const response = await client.request("POST", "/api/push/devices", { body });
      expect(response.status).toBe(200);
    }
  }

  async function changeShift(route: "assign" | "unassign", staffId: number) {
    const { year, week } = currentWeek();
    const planner = await loginAs("planner", "planner1234");
    await client.request("POST", `/api/shiftplan/${route}`, {
      jar: planner,
      csrf: true,
      body: { staff_id: staffId, shift_id: 1, year, week },
    });
  }

  it("sends app pushes without staff names and respects only-mine devices", async () => {
    await registerDevices();
    const { year, week } = currentWeek();
    await changeShift("assign", 1);
    await client.push.PushService.flushPendingChanges();
    calls.length = 0;

    await changeShift("unassign", 1);
    await changeShift("assign", 2);
    const result = await client.push.PushService.flushPendingChanges();
    const instanceId = (await client.request<{ instanceId: string }>("GET", "/api/instance")).json!.instanceId;
    const sends = calls.filter((call) => call.url === "https://relay.test/v1/send");

    expect(calls.map((call) => call.url)).toEqual(["https://relay.test/v1/send", "https://relay.test/v1/send"]);
    expect(sends.every((call) => call.auth === "Bearer inst_test.sk_test")).toBe(true);
    expect(sends.map((call) => call.body)).toEqual([
      {
        tokens: [ALL],
        notification: { title: "Schichtplan geändert", body: `KW ${week}: Frühschicht` },
        data: { instanceId, url: `/?year=${year}&week=${week}`, year: String(year), week: String(week) },
      },
      {
        tokens: [MINE_MAX, MINE_ANNA],
        notification: { title: "Deine Schicht hat sich geändert", body: `KW ${week}: Frühschicht` },
        data: { instanceId, url: `/?year=${year}&week=${week}`, year: String(year), week: String(week) },
      },
    ]);
    expect(JSON.stringify(sends)).not.toMatch(/Anna|Max|Olaf/);
    expect(result).toEqual({ sent: 3, failed: 0 });
  });

  it("registers once with the relay and stores the credentials", async () => {
    await registerDevices();
    await changeShift("assign", 1);
    await client.push.PushService.flushPendingChanges();
    await changeShift("assign", 2);
    await client.push.PushService.flushPendingChanges();

    const registrations = calls.filter((call) => call.url.endsWith("/v1/instances"));
    expect(registrations).toEqual([
      { url: "https://relay.test/v1/instances", auth: undefined, body: { name: "Schichtplaner", url: null } },
    ]);
  });

  it("deletes devices the relay reports as invalid", async () => {
    await registerDevices();
    relayResponses.push(
      () => json(201, { instanceId: "inst_test", secret: "sk_test" }),
      (call) => json(200, { sent: 0, failed: 1, invalidTokens: call.body.tokens })
    );

    const planner = await loginAs("planner", "planner1234");
    const notify = await client.request("POST", "/api/push/notify", {
      jar: planner,
      csrf: true,
      body: { message: "Teamtreffen Freitag 14 Uhr" },
    });

    expect(notify.json).toEqual({ sent: 0, failed: 1 });
    expect(calls.at(-1)?.body).toMatchObject({
      tokens: [ALL, MINE_MAX, MINE_ANNA, MINE_OTHER],
      notification: { title: "Nachricht vom Schichtplaner", body: "Teamtreffen Freitag 14 Uhr" },
    });
    expect(client.adminDb.prepare("SELECT COUNT(*) AS count FROM push_devices").get()).toEqual({ count: 0 });
  });

  it("registers again when the relay forgot the instance", async () => {
    await registerDevices();
    await changeShift("assign", 1);
    await client.push.PushService.flushPendingChanges();
    relayResponses.push(
      () => json(401, { error: "Unauthorized" }),
      () => json(201, { instanceId: "inst_new", secret: "sk_new" })
    );

    calls.length = 0;
    await changeShift("assign", 2);
    const result = await client.push.PushService.flushPendingChanges();

    expect(calls.map((call) => [call.url, call.auth])).toEqual([
      ["https://relay.test/v1/send", "Bearer inst_test.sk_test"],
      ["https://relay.test/v1/instances", undefined],
      ["https://relay.test/v1/send", "Bearer inst_new.sk_new"],
      ["https://relay.test/v1/send", "Bearer inst_new.sk_new"],
    ]);
    expect(result?.failed).toBe(0);
  });

  it("keeps web pushes working when the relay is down", async () => {
    await registerDevices();
    await client.request("POST", "/api/push/subscribe", { body: { endpoint: FCM_ENDPOINT, keys: KEYS } });
    relayResponses.push(() => json(503, { error: "down" }));

    await changeShift("assign", 1);
    const result = await client.push.PushService.flushPendingChanges();

    expect(sendNotification).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ sent: 1, failed: 2 });
  });

  it("does not contact any relay when app pushes are switched off", async () => {
    process.env.SHIFTPLAN_PUSH_RELAY_URL = "off";
    try {
      await registerDevices();
      await changeShift("assign", 1);
      await client.push.PushService.flushPendingChanges();
      expect(calls).toEqual([]);
    } finally {
      process.env.SHIFTPLAN_PUSH_RELAY_URL = "https://relay.test";
    }
  });
});
