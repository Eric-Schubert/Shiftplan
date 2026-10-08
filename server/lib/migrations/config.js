import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BACKEND_CONFIG = loadBackendConfig();
export const DEFAULT_ADMIN_USERNAME = "admin";
export const DEFAULT_ADMIN_PASSWORD = "admin";
export const BOOTSTRAP_ADMIN_PASSWORD_ENV = "SHIFTPLAN_ADMIN_PASSWORD";
export const MIN_BOOTSTRAP_PASSWORD_LENGTH = BACKEND_CONFIG.auth.passwordPolicy.minLength;
export const MAX_BOOTSTRAP_PASSWORD_LENGTH = BACKEND_CONFIG.auth.passwordPolicy.maxLength;
export const BOOTSTRAP_PASSWORD_HASH_COST = BACKEND_CONFIG.auth.bootstrapPasswordHashCost;
export const DEFAULT_SHIFT_COLOR = BACKEND_CONFIG.validation.shift.defaultColor;
export const DEFAULT_SHIFT_MIN_STAFF = BACKEND_CONFIG.validation.shift.minStaff.default;
export const DEFAULT_SHIFT_SORT_ORDER = BACKEND_CONFIG.validation.shift.sortOrder.default;
export const DEFAULT_ROTATION_CYCLE_LENGTH = BACKEND_CONFIG.rotation.defaultCycleLength;
export const DEFAULT_ROTATION_START_WEEK = BACKEND_CONFIG.rotation.defaultStartWeek;

function loadBackendConfig() {
  const configuredPath = process.env.SHIFTPLAN_BACKEND_CONFIG_PATH?.trim();
  const cwdPath = path.resolve(process.cwd(), "config", "backend.config.json");
  const sourcePath = fileURLToPath(new URL("../../../config/backend.config.json", import.meta.url));
  const configPath = configuredPath
    ? path.resolve(configuredPath)
    : fs.existsSync(cwdPath)
      ? cwdPath
      : sourcePath;

  return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}
