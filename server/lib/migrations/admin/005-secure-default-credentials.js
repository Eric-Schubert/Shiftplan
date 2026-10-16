// @ts-check
import { BOOTSTRAP_ADMIN_PASSWORD_ENV, DEFAULT_ADMIN_USERNAME } from "../config.js";
import { hashPassword, readBootstrapAdminPassword } from "../bootstrap-password.js";
import { hasDefaultAdminCredentials } from "../admin-credentials.js";

/** @type {import("../runner.js").Migration} */
export default {
  id: "005_admin_secure_default_credentials",
  description: "Block or rotate default admin credentials",
  shouldRun(database) {
    return hasDefaultAdminCredentials(database);
  },
  up(database, options) {
    const bootstrapPassword = readBootstrapAdminPassword(options);
    if (!bootstrapPassword) {
      throw new Error(
        `Insecure default credentials found. Set ${BOOTSTRAP_ADMIN_PASSWORD_ENV} to a strong password and run setup.js again to rotate the admin password.`
      );
    }

    database.prepare("UPDATE users SET password_hash = ? WHERE username = ? AND active = 1").run(hashPassword(bootstrapPassword), DEFAULT_ADMIN_USERNAME);
  },
};
