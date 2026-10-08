import { hasDefaultAdminCredentials } from "../lib/migrations/admin-credentials.js";
import { ADMIN_MIGRATIONS } from "../lib/migrations/admin/index.js";
import { hashPassword, readBootstrapAdminPassword } from "../lib/migrations/bootstrap-password.js";
import { MAIN_MIGRATIONS } from "../lib/migrations/main/index.js";
import { runMigrations } from "../lib/migrations/runner.js";
import { getTableColumns, tableExists } from "../lib/migrations/schema.js";

export function migrateMainDatabase(database, options = {}) {
  return runMigrations(database, "main", MAIN_MIGRATIONS, options);
}

export function migrateAdminDatabase(database, options = {}) {
  return runMigrations(database, "admin", ADMIN_MIGRATIONS, options);
}

export const databaseMigrationInternals = {
  getTableColumns,
  hashPassword,
  hasDefaultAdminCredentials,
  readBootstrapAdminPassword,
  tableExists,
};
