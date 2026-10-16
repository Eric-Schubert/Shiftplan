// @ts-check
import fs from "node:fs";
import path from "node:path";
import { BACKEND_CONFIG_DEFAULTS } from "./defaults.js";

// The one place that finds and reads the backend config file: Nitro (server/config/backend-config.ts),
// setup.js, the migrations and the Docker entrypoint all use it, so they always agree on the result.
// Plain JS on purpose: setup.js and the entrypoint run before any build.

export const BACKEND_CONFIG_PATH_ENV = "SHIFTPLAN_BACKEND_CONFIG_PATH";
export const BACKEND_CONFIG_FILE = path.join("config", "backend.config.json");

/** @typedef {{ env?: NodeJS.ProcessEnv; cwd?: string }} LoadOptions */

/**
 * Path of the config file: SHIFTPLAN_BACKEND_CONFIG_PATH, otherwise config/backend.config.json in the
 * working directory when it exists. null means no file, so the defaults apply unchanged.
 * @param {LoadOptions} [options]
 * @returns {string | null}
 */
export function resolveBackendConfigPath({ env = process.env, cwd = process.cwd() } = {}) {
  const configured = env[BACKEND_CONFIG_PATH_ENV]?.trim();
  if (configured) return path.resolve(cwd, configured);
  const cwdPath = path.resolve(cwd, BACKEND_CONFIG_FILE);
  return fs.existsSync(cwdPath) ? cwdPath : null;
}

/**
 * The file's content, which only needs the keys that differ from the defaults.
 * @param {string} file
 * @returns {Record<string, unknown>}
 */
export function readBackendConfigFile(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Backend config file ${file} does not exist (${BACKEND_CONFIG_PATH_ENV} points to it)`);
  }
  if (fs.statSync(file).isDirectory()) {
    throw new Error(`Backend config file ${file} is a directory; Docker creates one when the mounted host file is missing`);
  }
  let text;
  try {
    text = fs.readFileSync(file, "utf-8");
  } catch (error) {
    throw new Error(`Backend config file ${file} cannot be read: ${errorMessage(error)}`);
  }
  /** @type {unknown} */
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`Backend config file ${file} is not valid JSON: ${errorMessage(error)}`);
  }
  if (!isPlainObject(parsed)) {
    throw new Error(`Backend config file ${file} must hold a JSON object`);
  }
  return parsed;
}

// Settings a file replaces as a whole: holidays.subdivisionNames is the list of states the API accepts,
// so a file that names two Austrian states must not keep the 16 German ones.
const REPLACED_WHOLE = new Set(["holidays.subdivisionNames"]);

/**
 * Objects merge key by key; lists, single values and the settings above from the override replace the
 * base value. Keys the defaults do not know are kept, so the schema can warn about or reject them as before.
 * @param {Record<string, unknown>} base
 * @param {Record<string, unknown>} override
 * @param {string} [prefix] Dotted path of `base` in the config, for REPLACED_WHOLE.
 * @returns {Record<string, unknown>}
 */
export function mergeBackendConfig(base, override, prefix = "") {
  /** @type {Record<string, unknown>} */
  const merged = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (key === "__proto__") continue; // would set the prototype of the merged object
    const keyPath = prefix ? `${prefix}.${key}` : key;
    const current = merged[key];
    const mergeInto = !REPLACED_WHOLE.has(keyPath) && isPlainObject(current) && isPlainObject(value);
    merged[key] = mergeInto ? mergeBackendConfig(current, value, keyPath) : value;
  }
  return merged;
}

/**
 * The defaults with the config file merged over them, as a fresh copy. Without a file: the defaults.
 * Validation (server/config/backend-config.schema.ts) runs on this result.
 * @param {LoadOptions} [options]
 * @returns {Record<string, any>}
 */
export function loadBackendConfig(options = {}) {
  const file = resolveBackendConfigPath(options);
  const defaults = structuredClone(BACKEND_CONFIG_DEFAULTS);
  return file === null ? defaults : mergeBackendConfig(defaults, readBackendConfigFile(file));
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** @param {unknown} error */
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
