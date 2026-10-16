import path from "node:path";
import { describe, expect, it } from "vitest";
import { listFilesRecursive, readText } from "../scripts/docs/files.js";
import { getGuard, routeFromApiFile } from "../scripts/docs/routes.js";
import { ROUTE_POLICY, classifyRoute, matchesPrefix } from "~/server/config/route-policy";

// Handlers without requireAdmin, requirePlanner or requireMember that the auth middleware lets through
// without a planner session. Each one checks access itself or serves what it may serve to everyone who
// reaches it. A new handler on an open path (any method) needs a guard or a deliberate entry here.
const OPEN_WITHOUT_GUARD = [
  "DELETE /api/push/devices", // needs the device token
  "GET /api/absences", // reasons only for planners
  "GET /api/auth/session",
  "GET /api/holidays/public",
  "GET /api/holidays/school",
  "GET /api/instance",
  "GET /api/legal/privacy",
  "GET /api/rotation",
  "GET /api/shift",
  "GET /api/shiftplan",
  "GET /api/shiftplan/year-summary",
  "GET /api/staff",
  "GET /api/viewer/status",
  "POST /api/analytics/visit",
  "POST /api/auth/login",
  "POST /api/auth/logout", // ends whatever session the request carries
  "POST /api/contact",
  "POST /api/member/login", // short code and PIN
  "POST /api/member/logout", // ends whatever sign-in the request carries
  "POST /api/member/redeem", // one-time invite code
  "POST /api/push/devices", // checks the team access code
  "POST /api/push/subscribe", // checks the team access code
  "POST /api/push/unsubscribe", // needs the subscription endpoint
  "POST /api/viewer/login", // checks the team access code
  "POST /api/viewer/logout",
];

// Served by @nuxt/icon, not by a file under server/api.
const MODULE_PREFIXES = ["/api/_nuxt_icon"];

type Handler = { method: string; route: string; guarded: boolean };

const handlers: Handler[] = (listFilesRecursive(path.join("server", "api")) as string[])
  .filter((file) => file.endsWith(".ts"))
  .map((file) => ({ ...routeFromApiFile(file), guarded: getGuard(readText(file)) !== null }));

describe("route policy coverage", () => {
  it("finds the API handlers", () => {
    expect(handlers.length).toBeGreaterThan(50);
  });

  it("guards every handler that the policy does not leave to the planner session", () => {
    const open = handlers
      .filter((handler) => !handler.guarded && classifyRoute(handler.method, handler.route) !== "session")
      .map((handler) => `${handler.method} ${handler.route}`)
      .sort();

    expect(open).toEqual([...OPEN_WITHOUT_GUARD].sort());
  });

  it("does not count a guard that only appears in a comment", () => {
    expect(getGuard("// TODO requireAdmin(event)\nexport default defineEventHandler(() => 1);")).toBeNull();
    expect(getGuard('/* requirePlanner(event) */ const url = "https://example.org"; requireMember(event);')).toBe("Member");
  });

  it("names only routes and prefixes that have a handler", () => {
    const routes = handlers.map((handler) => handler.route);
    const readRoutes = handlers.filter((handler) => handler.method === "GET").map((handler) => handler.route);

    for (const route of [...ROUTE_POLICY.publicRoutes, ...ROUTE_POLICY.teamRoutes]) {
      expect(routes, route).toContain(route);
    }
    for (const prefix of [...ROUTE_POLICY.teamReadPrefixes, ...ROUTE_POLICY.publicReadPrefixes]) {
      if (MODULE_PREFIXES.includes(prefix)) continue;
      expect(
        readRoutes.some((route) => matchesPrefix(route, [prefix])),
        prefix
      ).toBe(true);
    }
    for (const prefix of [ROUTE_POLICY.memberPrefix, ROUTE_POLICY.legalPrefix]) {
      expect(
        routes.some((route) => route.startsWith(prefix)),
        prefix
      ).toBe(true);
    }
  });
});
