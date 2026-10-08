import { tableExists } from "../schema.js";

function deleteLegacyAdminPasswordSetting(database) {
  if (!tableExists(database, "settings")) return;
  database.prepare("DELETE FROM settings WHERE key = 'admin_password'").run();
}

export default {
  id: "006_admin_remove_legacy_password_setting",
  description: "Remove deprecated legacy admin password setting",
  shouldRun(database) {
    if (!tableExists(database, "settings")) return false;
    return Boolean(
      database.prepare("SELECT 1 FROM settings WHERE key = 'admin_password'").get()
    );
  },
  up(database) {
    deleteLegacyAdminPasswordSetting(database);
  },
};
