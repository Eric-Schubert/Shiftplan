// Who may reach an API route before its handler runs. server/middleware/auth.ts enforces it,
// scripts/docs/routes.js documents it in docs/api.md. Handlers add role checks on top
// (requireAdmin, requirePlanner, requireMember). No imports and only erasable type syntax,
// so `npm run docs` can load this file with plain Node.

export type RoutePolicy = {
  readonly publicRoutes: readonly string[];
  readonly legalPrefix: string;
  readonly teamRoutes: readonly string[];
  readonly memberPrefix: string;
  readonly teamReadPrefixes: readonly string[];
  readonly publicReadPrefixes: readonly string[];
  readonly csrfMethods: readonly string[];
};

/** How the auth middleware treats a request, see classifyRoute. */
export type RouteClass = "public" | "team" | "member" | "teamRead" | "publicRead" | "session";

export const ROUTE_POLICY: RoutePolicy = {
  // Exact paths open to anyone with any method: no session, no CSRF token. Signing out is here so a stale tab
  // can always end its session. With auth.session.cookies.sameSite "strict" (default) or "lax" the browser leaves
  // the session cookie off cross-site posts; with "none" a foreign page could sign a planner out, nothing more.
  publicRoutes: ["/api/auth/login", "/api/auth/session", "/api/auth/logout", "/api/analytics/visit", "/api/contact"],

  // GET below this prefix: facts for /datenschutz, public even when a team access code is set.
  legalPrefix: "/api/legal/",

  // Exact employee paths without a planner login, any method. The handlers check the team access code themselves.
  teamRoutes: [
    "/api/instance",
    "/api/viewer/login",
    "/api/viewer/logout",
    "/api/viewer/status",
    "/api/push/subscribe",
    "/api/push/unsubscribe",
    "/api/push/devices",
  ],

  // Personal app access, any method below this prefix. The handlers authenticate the staff member themselves
  // (requireMember, or short code and PIN). Writes with the member cookie must come from this site (Origin header).
  memberPrefix: "/api/member/",

  // GET below these prefixes is plan data for employees: open while no team access code is set,
  // otherwise only with the code, a personal sign-in or a planner session.
  teamReadPrefixes: ["/api/staff", "/api/shift", "/api/shiftplan", "/api/rotation", "/api/absences"],

  // GET below these prefixes is open to anyone, also with a team access code.
  publicReadPrefixes: ["/api/_nuxt_icon", "/api/holidays"],

  // Everything else needs a planner or admin session. Cookie sessions also need the CSRF token for these
  // methods; a Bearer token from the app does not. auth.routes.csrfMethods in the backend config overrides them.
  csrfMethods: ["POST", "PATCH", "PUT", "DELETE"],
};

/** `/api/staff` covers `/api/staff` and `/api/staff/1`, not `/api/staffing`. */
export function matchesPrefix(path: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => path === prefix || path.startsWith(prefix + "/"));
}

/** The class of an /api/ path, checked in this order. Paths outside /api/ are not the middleware's business. */
export function classifyRoute(method: string, path: string): RouteClass {
  const policy = ROUTE_POLICY;
  if (policy.publicRoutes.includes(path)) return "public";
  if (method === "GET" && path.startsWith(policy.legalPrefix)) return "public";
  if (policy.teamRoutes.includes(path)) return "team";
  if (path.startsWith(policy.memberPrefix)) return "member";
  if (method === "GET" && matchesPrefix(path, policy.teamReadPrefixes)) return "teamRead";
  if (method === "GET" && matchesPrefix(path, policy.publicReadPrefixes)) return "publicRead";
  return "session";
}
