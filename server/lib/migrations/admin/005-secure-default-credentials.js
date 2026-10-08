import { BOOTSTRAP_ADMIN_PASSWORD_ENV, DEFAULT_ADMIN_USERNAME } from "../config.js";
import { hashPassword, readBootstrapAdminPassword } from "../bootstrap-password.js";
import { hasDefaultAdminCredentials } from "../admin-credentials.js";

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
        `Unsichere Standard-Anmeldedaten erkannt. Setze ${BOOTSTRAP_ADMIN_PASSWORD_ENV} auf ein starkes Passwort und fuehre setup.js erneut aus, um den Admin zu rotieren.`
      );
    }

    database
      .prepare("UPDATE users SET password_hash = ? WHERE username = ? AND active = 1")
      .run(hashPassword(bootstrapPassword), DEFAULT_ADMIN_USERNAME);
  },
};
