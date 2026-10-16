import { ROUTE_POLICY } from "./route-policy";

// Older backend config files list open routes themselves (auth.routes.public, auth.routes.publicGetPrefixes),
// and self-hosters mount full copies. route-policy.ts decides now. Extra entries in such a list would have
// opened routes, so they are ignored with a warning. A list without a shipped entry required a planner login
// there; ignoring it would open the route, so the server refuses to start instead.
const SHIPPED_ROUTE_LISTS: Record<string, readonly string[]> = {
  public: ["/api/auth/login", "/api/auth/session", "/api/analytics/visit", "/api/contact"],
  publicGetPrefixes: ["/api/_nuxt_icon", "/api/staff", "/api/shift", "/api/shiftplan", "/api/rotation", "/api/holidays"],
};

export type RouteConfig = { csrfMethods: string[] };

function checkLegacyList(key: string, configured: string[], shipped: readonly string[]): void {
  const missing = shipped.filter((entry) => !configured.includes(entry));
  if (missing.length > 0) {
    throw new Error(
      `Invalid backend configuration: auth.routes.${key} leaves out ${missing.join(", ")}, which needed a ` +
        "planner login on this instance. Route lists in backend.config.json are no longer read and cannot " +
        "close routes. Remove auth.routes.public and auth.routes.publicGetPrefixes from the file; to keep " +
        "the plan private, set a team access code (see docs/configuration.md)."
    );
  }
  if (configured.length > shipped.length || configured.some((entry) => !shipped.includes(entry))) {
    console.warn(
      `[config] auth.routes.${key} is ignored: the built-in route policy decides which API routes are open ` +
        "(see docs/configuration.md). Remove the key from backend.config.json."
    );
  }
}

/** auth.routes from the validated config file: only csrfMethods still counts, upper-cased for the request comparison. */
export function resolveRouteConfig(configured: Record<string, any> | undefined): RouteConfig {
  for (const [key, shipped] of Object.entries(SHIPPED_ROUTE_LISTS)) {
    if (configured?.[key] !== undefined) checkLegacyList(key, configured[key], shipped);
  }

  const methods: readonly string[] = configured?.csrfMethods ?? ROUTE_POLICY.csrfMethods;
  return { csrfMethods: methods.map((method) => method.toUpperCase()) };
}
