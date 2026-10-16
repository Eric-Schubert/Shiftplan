import { ROUTE_POLICY } from "./route-policy";

// Older backend config files list open routes themselves (auth.routes.public, auth.routes.publicGetPrefixes),
// and self-hosters mount full copies. route-policy.ts decides now, so these lists are ignored. A warning names
// them only when they differ from the values every release shipped, because only then did the instance behave differently.
const SHIPPED_ROUTE_LISTS: Record<string, readonly string[]> = {
  public: ["/api/auth/login", "/api/auth/session", "/api/analytics/visit", "/api/contact"],
  publicGetPrefixes: ["/api/_nuxt_icon", "/api/staff", "/api/shift", "/api/shiftplan", "/api/rotation", "/api/holidays"],
};

export type RouteConfig = { csrfMethods: string[] };

function isShippedList(value: unknown, shipped: readonly string[]): boolean {
  return (
    Array.isArray(value) && value.length === shipped.length && shipped.every((entry) => value.includes(entry))
  );
}

/** auth.routes from the config file: only csrfMethods still counts, upper-cased for the request comparison. */
export function resolveRouteConfig(configured: Record<string, any> | undefined): RouteConfig {
  for (const [key, shipped] of Object.entries(SHIPPED_ROUTE_LISTS)) {
    if (configured?.[key] !== undefined && !isShippedList(configured[key], shipped)) {
      console.warn(
        `[config] auth.routes.${key} is ignored: the built-in route policy decides which API routes are open ` +
          "(see docs/configuration.md). Remove the key from backend.config.json."
      );
    }
  }

  const methods: readonly string[] = configured?.csrfMethods ?? ROUTE_POLICY.csrfMethods;
  return { csrfMethods: methods.map((method) => method.toUpperCase()) };
}
