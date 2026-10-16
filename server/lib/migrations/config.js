// @ts-check
import { loadBackendConfig } from "../config/load.js";

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
