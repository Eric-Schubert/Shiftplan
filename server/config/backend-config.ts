import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateBackendConfig } from "./backend-config.schema";
import type { BackendConfig } from "./backend-config.types";

let cachedConfig: BackendConfig | null = null;

export function getBackendConfig(): BackendConfig {
  if (!cachedConfig) {
    cachedConfig = applyEnvOverrides(validateBackendConfig(readBackendConfig()));
  }

  return cachedConfig;
}

// Deployment-specific switches that should not require a full config file copy.
function applyEnvOverrides(config: BackendConfig): BackendConfig {
  const trustProxyHeaders = parseBooleanEnv("SHIFTPLAN_TRUST_PROXY_HEADERS");
  if (trustProxyHeaders !== undefined) {
    config.auth.trustProxyHeaders = trustProxyHeaders;
  }

  return config;
}

function parseBooleanEnv(name: string): boolean | undefined {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return undefined;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;

  throw new Error(`${name} muss true oder false sein`);
}

export function resetBackendConfigForTests(): void {
  cachedConfig = null;
}

function readBackendConfig(): unknown {
  const configPath = resolveConfigPath();
  const raw = fs.readFileSync(configPath, "utf-8");
  return JSON.parse(raw);
}

function resolveConfigPath(): string {
  const configuredPath = process.env.SHIFTPLAN_BACKEND_CONFIG_PATH?.trim();
  if (configuredPath) {
    return path.resolve(configuredPath);
  }

  const cwdPath = path.resolve(process.cwd(), "config", "backend.config.json");
  if (fs.existsSync(cwdPath)) {
    return cwdPath;
  }

  return fileURLToPath(new URL("../../config/backend.config.json", import.meta.url));
}
