import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { vi } from "vitest";
import { resetBackendConfigForTests } from "~/server/config/backend-config";

let dir: string | null = null;

/** Writes content as a backend config file in a fresh temp folder and points SHIFTPLAN_BACKEND_CONFIG_PATH at it. */
export function mountBackendConfig(content: unknown): string {
  dir ??= fs.mkdtempSync(path.join(os.tmpdir(), "shiftplan-config-"));
  const file = path.join(dir, "backend.config.json");
  fs.writeFileSync(file, JSON.stringify(content));
  vi.stubEnv("SHIFTPLAN_BACKEND_CONFIG_PATH", file);
  resetBackendConfigForTests();
  return file;
}

/** The temp folder of the current test, created on demand. */
export function backendConfigDir(): string {
  dir ??= fs.mkdtempSync(path.join(os.tmpdir(), "shiftplan-config-"));
  return dir;
}

/** For afterEach: drops the env override, the cached config and the temp folder. */
export function unmountBackendConfig(): void {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  resetBackendConfigForTests();
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
  dir = null;
}
