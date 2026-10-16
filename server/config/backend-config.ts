import { loadBackendConfig } from "~/server/lib/config/load.js";
import { validateBackendConfig } from "./backend-config.schema";
import type { BackendConfig } from "./backend-config.types";
import { resolveRouteConfig } from "./route-config";

let cachedConfig: BackendConfig | null = null;

// Defaults from server/lib/config/defaults.js with the optional config file merged over them, then validated.
export function getBackendConfig(): BackendConfig {
  if (!cachedConfig) {
    cachedConfig = applyEnvOverrides(normalize(validateBackendConfig(loadBackendConfig())));
  }

  return cachedConfig;
}

// auth.routes is optional; the route policy is built in (route-config.ts).
function normalize(config: BackendConfig): BackendConfig {
  config.auth.routes = resolveRouteConfig(config.auth.routes);
  return config;
}

// Deployment-specific switches that should not require a config file.
function applyEnvOverrides(config: BackendConfig): BackendConfig {
  const trustProxyHeaders = parseTrustProxyEnv("SHIFTPLAN_TRUST_PROXY_HEADERS");
  if (trustProxyHeaders !== undefined) {
    config.auth.trustProxyHeaders = trustProxyHeaders;
  }

  return config;
}

function parseTrustProxyEnv(name: string): boolean | "cloudflare" | undefined {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return undefined;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  if (value === "cloudflare") return "cloudflare";

  throw new Error(`${name} must be true, false or cloudflare`);
}

export function resetBackendConfigForTests(): void {
  cachedConfig = null;
}
