// @ts-check
import bcrypt from "bcryptjs";
import { hashPassword, isPasswordHash, readBootstrapAdminPassword } from "./bootstrap-password.js";
import { BOOTSTRAP_ADMIN_PASSWORD_ENV, DEFAULT_ADMIN_PASSWORD, DEFAULT_ADMIN_USERNAME } from "./config.js";
import { tableExists } from "./schema.js";

/** @typedef {import("better-sqlite3").Database} Database */
/** @typedef {import("./runner.js").MigrationOptions} MigrationOptions */

/**
 * @param {Database} database
 * @returns {string | undefined}
 */
function getLegacyAdminPassword(database) {
  if (!tableExists(database, "settings")) return undefined;
  const row = /** @type {{ value: string } | undefined} */ (
    database.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get()
  );
  return row?.value;
}

/**
 * @param {Database} database
 * @param {MigrationOptions} [options]
 */
function resolveSeedPasswordHash(database, options = {}) {
  const legacyPassword = getLegacyAdminPassword(database);
  if (legacyPassword) {
    return hashPassword(legacyPassword);
  }

  const bootstrapPassword = readBootstrapAdminPassword(options);
  if (bootstrapPassword) {
    return hashPassword(bootstrapPassword);
  }

  return undefined;
}

/** @typedef {{ user_id: number; username: string; password_hash: string | null; active: number }} AdminUserRow */

/**
 * @param {Database} database
 * @returns {AdminUserRow | undefined}
 */
function getDefaultAdminUser(database) {
  if (!tableExists(database, "users")) return undefined;
  return /** @type {AdminUserRow | undefined} */ (
    database
      .prepare("SELECT user_id, username, password_hash, active FROM users WHERE username = ? LIMIT 1")
      .get(DEFAULT_ADMIN_USERNAME)
  );
}

/** @param {Database} database */
export function hasDefaultAdminCredentials(database) {
  const adminUser = getDefaultAdminUser(database);
  if (!adminUser || Number(adminUser.active) !== 1) return false;
  if (typeof adminUser.password_hash !== "string" || adminUser.password_hash.length === 0) {
    return false;
  }

  if (!isPasswordHash(adminUser.password_hash)) {
    return adminUser.password_hash === DEFAULT_ADMIN_PASSWORD;
  }

  return bcrypt.compareSync(DEFAULT_ADMIN_PASSWORD, adminUser.password_hash);
}

/**
 * @param {Database} database
 * @param {MigrationOptions} options
 * @param {string} contextMessage Why a password is needed, starts the error message.
 */
export function requireBootstrapPasswordHash(database, options = {}, contextMessage) {
  const passwordHash = resolveSeedPasswordHash(database, options);
  if (passwordHash) return passwordHash;

  throw new Error(
    `${contextMessage} Set ${BOOTSTRAP_ADMIN_PASSWORD_ENV} to a strong password and run setup.js again.`
  );
}
