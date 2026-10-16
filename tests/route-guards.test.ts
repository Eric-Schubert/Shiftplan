import path from "node:path";
import { describe, expect, it } from "vitest";
import { listFilesRecursive, readText } from "../scripts/docs/files.js";
import { routeFromApiFile } from "../scripts/docs/routes.js";
import { ROUTE_POLICY, classifyRoute, matchesPrefix } from "~/server/config/route-policy";

const GUARD = /\brequire(?:Admin|Planner|Member)\(/;

// Handlers without a guard that the route policy opens only through a prefix. Each one checks access
// itself or serves what everyone with plan access may see. A new handler below one of these prefixes
// needs a guard or a deliberate entry here.
const OPEN_BY_PREFIX = [
  "GET /api/absences", // reasons only for planners
  "GET /api/holidays/public",
  "GET /api/holidays/school",
  "GET /api/legal/privacy",
  "GET /api/rotation",
  "GET /api/shift",
  "GET /api/shiftplan",
  "GET /api/shiftplan/year-summary",
  "GET /api/staff",
  "POST /api/member/login", // short code and PIN
  "POST /api/member/logout", // ends whatever sign-in the request carries
  "POST /api/member/redeem", // one-time invite code
];

// Served by @nuxt/icon, not by a file under server/api.
const MODULE_PREFIXES = ["/api/_nuxt_icon"];

type Handler = { method: string; route: string; guarded: boolean };

const handlers: Handler[] = (listFilesRecursive(path.join("server", "api")) as string[])
  .filter((file) => file.endsWith(".ts"))
  .map((file) => ({ ...routeFromApiFile(file), guarded: GUARD.test(readText(file)) }));

describe("route policy coverage", () => {
  it("finds the API handlers", () => {
    expect(handlers.length).toBeGreaterThan(50);
  });

  it("guards every handler that the policy does not leave to the planner session or list by path", () => {
    const listed = [...ROUTE_POLICY.publicRoutes, ...ROUTE_POLICY.teamRoutes];
    const openByPrefix = handlers
      .filter((handler) => !handler.guarded && !listed.includes(handler.route))
      .filter((handler) => classifyRoute(handler.method, handler.route) !== "session")
      .map((handler) => `${handler.method} ${handler.route}`)
      .sort();

    expect(openByPrefix).toEqual([...OPEN_BY_PREFIX].sort());
  });

  it("names only routes and prefixes that have a handler", () => {
    const routes = handlers.map((handler) => handler.route);
    const readRoutes = handlers.filter((handler) => handler.method === "GET").map((handler) => handler.route);

    for (const route of [...ROUTE_POLICY.publicRoutes, ...ROUTE_POLICY.teamRoutes]) {
      expect(routes, route).toContain(route);
    }
    for (const prefix of [...ROUTE_POLICY.teamReadPrefixes, ...ROUTE_POLICY.publicReadPrefixes]) {
      if (MODULE_PREFIXES.includes(prefix)) continue;
      expect(readRoutes.some((route) => matchesPrefix(route, [prefix])), prefix).toBe(true);
    }
    for (const prefix of [ROUTE_POLICY.memberPrefix, ROUTE_POLICY.legalPrefix]) {
      expect(routes.some((route) => route.startsWith(prefix)), prefix).toBe(true);
    }
  });
});
