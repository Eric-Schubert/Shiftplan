import bcrypt from "bcryptjs";

const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "admin";
const BOOTSTRAP_ADMIN_PASSWORD_ENV = "SHIFTPLAN_ADMIN_PASSWORD";
const MIN_BOOTSTRAP_PASSWORD_LENGTH = 8;
const MAX_BOOTSTRAP_PASSWORD_LENGTH = 256;

function tableExists(database, table) {
  const row = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table);
  return Boolean(row);
}

function indexExists(database, index) {
  const row = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?")
    .get(index);
  return Boolean(row);
}

function getTableColumns(database, table) {
  if (!tableExists(database, table)) return new Set();
  const columns = database.prepare(`PRAGMA table_info(${table})`).all();
  return new Set(columns.map((column) => column.name));
}

function hasMissingColumns(database, table, columns) {
  const existing = getTableColumns(database, table);
  return columns.some((column) => !existing.has(column));
}

function addColumnIfMissing(database, table, column, definition) {
  const columns = getTableColumns(database, table);
  if (!columns.has(column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    return true;
  }
  return false;
}

function ensureSchemaMigrationsTable(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

function recordMigration(database, migration) {
  database
    .prepare(
      "INSERT OR REPLACE INTO schema_migrations (id, description, applied_at) VALUES (?, ?, datetime('now'))"
    )
    .run(migration.id, migration.description);
}

function isPasswordHash(value) {
  return typeof value === "string" && /^\$2[aby]\$\d{2}\$/.test(value);
}

function hashPassword(value) {
  return isPasswordHash(value) ? value : bcrypt.hashSync(value, 10);
}

function getLegacyAdminPassword(database) {
  if (!tableExists(database, "settings")) return undefined;
  return database
    .prepare("SELECT value FROM settings WHERE key = 'admin_password'")
    .get()?.value;
}

function deleteLegacyAdminPasswordSetting(database) {
  if (!tableExists(database, "settings")) return;
  database.prepare("DELETE FROM settings WHERE key = 'admin_password'").run();
}

function validateBootstrapAdminPassword(password) {
  if (password.length < MIN_BOOTSTRAP_PASSWORD_LENGTH) {
    return `${BOOTSTRAP_ADMIN_PASSWORD_ENV} muss mindestens ${MIN_BOOTSTRAP_PASSWORD_LENGTH} Zeichen haben`;
  }
  if (password.length > MAX_BOOTSTRAP_PASSWORD_LENGTH) {
    return `${BOOTSTRAP_ADMIN_PASSWORD_ENV} darf maximal ${MAX_BOOTSTRAP_PASSWORD_LENGTH} Zeichen haben`;
  }
  if (!/[A-Z]/.test(password)) {
    return `${BOOTSTRAP_ADMIN_PASSWORD_ENV} muss mindestens einen Großbuchstaben enthalten`;
  }
  if (!/[a-z]/.test(password)) {
    return `${BOOTSTRAP_ADMIN_PASSWORD_ENV} muss mindestens einen Kleinbuchstaben enthalten`;
  }
  if (!/[0-9]/.test(password)) {
    return `${BOOTSTRAP_ADMIN_PASSWORD_ENV} muss mindestens eine Zahl enthalten`;
  }
  return null;
}

function readBootstrapAdminPassword(options = {}) {
  const directValue =
    typeof options.bootstrapAdminPassword === "string"
      ? options.bootstrapAdminPassword
      : process.env[BOOTSTRAP_ADMIN_PASSWORD_ENV];

  if (typeof directValue !== "string") return undefined;

  const password = directValue.trim();
  if (password.length === 0) return undefined;

  const validationMessage = validateBootstrapAdminPassword(password);
  if (validationMessage) {
    throw new Error(validationMessage);
  }

  return password;
}

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

function getMissingPasswordHashCount(database) {
  if (!tableExists(database, "users")) return 0;
  const row = database
    .prepare("SELECT COUNT(*) AS count FROM users WHERE password_hash IS NULL OR password_hash = ''")
    .get();
  return row?.count || 0;
}

function getDefaultAdminUser(database) {
  if (!tableExists(database, "users")) return undefined;
  return database
    .prepare(
      "SELECT user_id, username, password_hash, active FROM users WHERE username = ? LIMIT 1"
    )
    .get(DEFAULT_ADMIN_USERNAME);
}

function hasDefaultAdminCredentials(database) {
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

function requireBootstrapPasswordHash(database, options = {}, contextMessage) {
  const passwordHash = resolveSeedPasswordHash(database, options);
  if (passwordHash) return passwordHash;

  throw new Error(
    `${contextMessage} Setze ${BOOTSTRAP_ADMIN_PASSWORD_ENV} auf ein starkes Passwort und fuehre setup.js erneut aus.`
  );
}

const MAIN_MIGRATIONS = [
  {
    id: "001_main_core_schema",
    description: "Create and normalize core planning tables",
    shouldRun(database) {
      return (
        !tableExists(database, "staff") ||
        !tableExists(database, "shifts") ||
        !tableExists(database, "weeks") ||
        !tableExists(database, "shift_assignments") ||
        hasMissingColumns(database, "staff", ["active", "is_parttime"]) ||
        hasMissingColumns(database, "shifts", ["active", "color", "min_staff", "sort_order"]) ||
        !indexExists(database, "idx_weeks_year_week_number") ||
        !indexExists(database, "idx_shift_assignments_unique")
      );
    },
    up(database) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS staff (
          staff_id INTEGER PRIMARY KEY AUTOINCREMENT,
          active INTEGER NOT NULL DEFAULT 1,
          name TEXT NOT NULL,
          is_parttime INTEGER NOT NULL DEFAULT 0
        )
      `);

      addColumnIfMissing(database, "staff", "active", "INTEGER NOT NULL DEFAULT 1");
      addColumnIfMissing(database, "staff", "is_parttime", "INTEGER NOT NULL DEFAULT 0");
      database.exec("UPDATE staff SET active = 1 WHERE active IS NULL");
      database.exec("UPDATE staff SET is_parttime = 0 WHERE is_parttime IS NULL");

      database.exec(`
        CREATE TABLE IF NOT EXISTS shifts (
          shift_id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          active INTEGER NOT NULL DEFAULT 1,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          color TEXT DEFAULT '#6366f1',
          min_staff INTEGER NOT NULL DEFAULT 1,
          sort_order INTEGER NOT NULL DEFAULT 0
        )
      `);

      addColumnIfMissing(database, "shifts", "active", "INTEGER NOT NULL DEFAULT 1");
      addColumnIfMissing(database, "shifts", "color", "TEXT DEFAULT '#6366f1'");
      addColumnIfMissing(database, "shifts", "min_staff", "INTEGER NOT NULL DEFAULT 1");
      addColumnIfMissing(database, "shifts", "sort_order", "INTEGER NOT NULL DEFAULT 0");
      database.exec("UPDATE shifts SET active = 1 WHERE active IS NULL");
      database.exec("UPDATE shifts SET color = '#6366f1' WHERE color IS NULL OR color = ''");
      database.exec("UPDATE shifts SET min_staff = 1 WHERE min_staff IS NULL");
      database.exec("UPDATE shifts SET sort_order = 0 WHERE sort_order IS NULL");

      database.exec(`
        CREATE TABLE IF NOT EXISTS weeks (
          week_id INTEGER PRIMARY KEY AUTOINCREMENT,
          year INTEGER NOT NULL,
          week_number INTEGER NOT NULL,
          UNIQUE(year, week_number)
        )
      `);
      database.exec(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_weeks_year_week_number ON weeks(year, week_number)"
      );

      database.exec(`
        CREATE TABLE IF NOT EXISTS shift_assignments (
          assignment_id INTEGER PRIMARY KEY AUTOINCREMENT,
          staff_id INTEGER NOT NULL,
          shift_id INTEGER NOT NULL,
          week_id INTEGER NOT NULL,
          FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE,
          FOREIGN KEY (shift_id) REFERENCES shifts(shift_id) ON DELETE CASCADE,
          FOREIGN KEY (week_id) REFERENCES weeks(week_id) ON DELETE CASCADE,
          UNIQUE(staff_id, shift_id, week_id)
        )
      `);
      database.exec(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_shift_assignments_unique ON shift_assignments(staff_id, shift_id, week_id)"
      );
    },
  },
  {
    id: "002_main_rotation_schema",
    description: "Create and normalize rotation tables",
    shouldRun(database) {
      return (
        !tableExists(database, "rotation_config") ||
        !tableExists(database, "rotation_pattern") ||
        hasMissingColumns(database, "rotation_config", ["cycle_length", "start_year", "start_week"]) ||
        !indexExists(database, "idx_rotation_pattern_unique")
      );
    },
    up(database) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS rotation_config (
          config_id INTEGER PRIMARY KEY AUTOINCREMENT,
          cycle_length INTEGER NOT NULL DEFAULT 4,
          start_year INTEGER NOT NULL,
          start_week INTEGER NOT NULL
        )
      `);

      addColumnIfMissing(database, "rotation_config", "cycle_length", "INTEGER NOT NULL DEFAULT 4");
      addColumnIfMissing(database, "rotation_config", "start_year", "INTEGER");
      addColumnIfMissing(database, "rotation_config", "start_week", "INTEGER");
      database.exec("UPDATE rotation_config SET cycle_length = 4 WHERE cycle_length IS NULL");
      database.exec(
        "UPDATE rotation_config SET start_year = CAST(strftime('%Y', 'now') AS INTEGER) WHERE start_year IS NULL"
      );
      database.exec("UPDATE rotation_config SET start_week = 1 WHERE start_week IS NULL");

      database.exec(`
        CREATE TABLE IF NOT EXISTS rotation_pattern (
          pattern_id INTEGER PRIMARY KEY AUTOINCREMENT,
          pattern_week INTEGER NOT NULL,
          staff_id INTEGER NOT NULL,
          shift_id INTEGER NOT NULL,
          FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE,
          FOREIGN KEY (shift_id) REFERENCES shifts(shift_id) ON DELETE CASCADE,
          UNIQUE(pattern_week, staff_id, shift_id)
        )
      `);
      database.exec(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_rotation_pattern_unique ON rotation_pattern(pattern_week, staff_id, shift_id)"
      );
    },
  },
  {
    id: "003_main_audit_schema",
    description: "Create and normalize audit log table",
    shouldRun(database) {
      return (
        !tableExists(database, "audit_log") ||
        hasMissingColumns(database, "audit_log", [
          "shift_id",
          "shift_name",
          "staff_id",
          "staff_name",
          "reason",
          "created_at",
        ])
      );
    },
    up(database) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS audit_log (
          audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          username TEXT NOT NULL,
          action TEXT NOT NULL,
          year INTEGER NOT NULL,
          week_number INTEGER NOT NULL,
          shift_id INTEGER,
          shift_name TEXT,
          staff_id INTEGER,
          staff_name TEXT,
          reason TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);

      addColumnIfMissing(database, "audit_log", "shift_id", "INTEGER");
      addColumnIfMissing(database, "audit_log", "shift_name", "TEXT");
      addColumnIfMissing(database, "audit_log", "staff_id", "INTEGER");
      addColumnIfMissing(database, "audit_log", "staff_name", "TEXT");
      addColumnIfMissing(database, "audit_log", "reason", "TEXT");
      if (addColumnIfMissing(database, "audit_log", "created_at", "TEXT")) {
        database.exec("UPDATE audit_log SET created_at = datetime('now') WHERE created_at IS NULL");
      }
    },
  },
  {
    id: "004_main_page_visits_schema",
    description: "Create page visit analytics table",
    shouldRun(database) {
      return (
        !tableExists(database, "page_visits") ||
        hasMissingColumns(database, "page_visits", [
          "visit_date",
          "path",
          "visitor_hash",
          "user_agent",
          "referrer",
          "country_code",
          "region",
          "city",
          "created_at",
        ]) ||
        !indexExists(database, "idx_page_visits_date") ||
        !indexExists(database, "idx_page_visits_path_date") ||
        !indexExists(database, "idx_page_visits_visitor_date") ||
        !indexExists(database, "idx_page_visits_country_date")
      );
    },
    up(database) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS page_visits (
          visit_id INTEGER PRIMARY KEY AUTOINCREMENT,
          visit_date TEXT NOT NULL,
          path TEXT NOT NULL,
          visitor_hash TEXT NOT NULL,
          user_agent TEXT,
          referrer TEXT,
          country_code TEXT,
          region TEXT,
          city TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);

      addColumnIfMissing(database, "page_visits", "visit_date", "TEXT NOT NULL DEFAULT ''");
      addColumnIfMissing(database, "page_visits", "path", "TEXT NOT NULL DEFAULT '/'");
      addColumnIfMissing(database, "page_visits", "visitor_hash", "TEXT NOT NULL DEFAULT ''");
      addColumnIfMissing(database, "page_visits", "user_agent", "TEXT");
      addColumnIfMissing(database, "page_visits", "referrer", "TEXT");
      addColumnIfMissing(database, "page_visits", "country_code", "TEXT");
      addColumnIfMissing(database, "page_visits", "region", "TEXT");
      addColumnIfMissing(database, "page_visits", "city", "TEXT");
      if (addColumnIfMissing(database, "page_visits", "created_at", "TEXT")) {
        database.exec("UPDATE page_visits SET created_at = datetime('now') WHERE created_at IS NULL");
      }

      database.exec("CREATE INDEX IF NOT EXISTS idx_page_visits_date ON page_visits(visit_date)");
      database.exec(
        "CREATE INDEX IF NOT EXISTS idx_page_visits_path_date ON page_visits(path, visit_date)"
      );
      database.exec(
        "CREATE INDEX IF NOT EXISTS idx_page_visits_visitor_date ON page_visits(visit_date, visitor_hash)"
      );
      database.exec(
        "CREATE INDEX IF NOT EXISTS idx_page_visits_country_date ON page_visits(visit_date, country_code)"
      );
    },
  },
];

const ADMIN_MIGRATIONS = [
  {
    id: "001_admin_settings_schema",
    description: "Create settings table",
    shouldRun(database) {
      return !tableExists(database, "settings");
    },
    up(database) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `);
    },
  },
  {
    id: "002_admin_users_schema",
    description: "Create and normalize users table",
    shouldRun(database) {
      return (
        !tableExists(database, "users") ||
        hasMissingColumns(database, "users", ["username", "password_hash", "role", "active", "created_at"]) ||
        !indexExists(database, "idx_users_username")
      );
    },
    up(database, options) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS users (
          user_id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'planner' CHECK(role IN ('admin', 'planner')),
          active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);

      addColumnIfMissing(database, "users", "password_hash", "TEXT");
      addColumnIfMissing(database, "users", "role", "TEXT NOT NULL DEFAULT 'admin'");
      addColumnIfMissing(database, "users", "active", "INTEGER NOT NULL DEFAULT 1");
      if (addColumnIfMissing(database, "users", "created_at", "TEXT")) {
        database.exec("UPDATE users SET created_at = datetime('now') WHERE created_at IS NULL");
      }

      database.exec("UPDATE users SET role = 'admin' WHERE role IS NULL OR role = ''");
      database.exec("UPDATE users SET active = 1 WHERE active IS NULL");
      database.exec("UPDATE users SET created_at = datetime('now') WHERE created_at IS NULL");

      const missingPasswordHashCount = getMissingPasswordHashCount(database);
      if (missingPasswordHashCount > 0) {
        const fallbackPasswordHash = requireBootstrapPasswordHash(
          database,
          options,
          "Es existieren Benutzer ohne Passwort-Hash."
        );
        database
          .prepare("UPDATE users SET password_hash = ? WHERE password_hash IS NULL OR password_hash = ''")
          .run(fallbackPasswordHash);
      }

      database.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)");
    },
  },
  {
    id: "003_admin_bootstrap_user",
    description: "Seed admin user from legacy settings or bootstrap password",
    shouldRun(database) {
      if (!tableExists(database, "users")) return true;
      const existingUsers = database.prepare("SELECT COUNT(*) AS count FROM users").get();
      return existingUsers.count === 0;
    },
    up(database, options) {
      const passwordHash = requireBootstrapPasswordHash(
        database,
        options,
        "Kein Admin-Benutzer vorhanden."
      );

      database
        .prepare(
          "INSERT INTO users (username, password_hash, role, active, created_at) VALUES (?, ?, 'admin', 1, datetime('now'))"
        )
        .run(DEFAULT_ADMIN_USERNAME, passwordHash);
    },
  },
  {
    id: "004_admin_auth_state_schema",
    description: "Create persistent auth session and login throttle tables",
    shouldRun(database) {
      return (
        !tableExists(database, "auth_sessions") ||
        !tableExists(database, "login_rate_limits") ||
        hasMissingColumns(database, "auth_sessions", [
          "session_token",
          "user_id",
          "username",
          "role",
          "csrf_token",
          "created_at",
          "expires_at",
          "last_activity",
        ]) ||
        hasMissingColumns(database, "login_rate_limits", [
          "ip",
          "count",
          "first_attempt",
          "blocked_until",
        ]) ||
        !indexExists(database, "idx_auth_sessions_expires_at") ||
        !indexExists(database, "idx_login_rate_limits_blocked_until")
      );
    },
    up(database) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS auth_sessions (
          session_token TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL,
          username TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('admin', 'planner')),
          csrf_token TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL,
          last_activity INTEGER NOT NULL
        )
      `);

      addColumnIfMissing(database, "auth_sessions", "user_id", "INTEGER NOT NULL DEFAULT 0");
      addColumnIfMissing(database, "auth_sessions", "username", "TEXT NOT NULL DEFAULT ''");
      addColumnIfMissing(database, "auth_sessions", "role", "TEXT NOT NULL DEFAULT 'planner'");
      addColumnIfMissing(database, "auth_sessions", "csrf_token", "TEXT NOT NULL DEFAULT ''");
      addColumnIfMissing(database, "auth_sessions", "created_at", "INTEGER NOT NULL DEFAULT 0");
      addColumnIfMissing(database, "auth_sessions", "expires_at", "INTEGER NOT NULL DEFAULT 0");
      addColumnIfMissing(database, "auth_sessions", "last_activity", "INTEGER NOT NULL DEFAULT 0");
      database.exec(
        "CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at)"
      );

      database.exec(`
        CREATE TABLE IF NOT EXISTS login_rate_limits (
          ip TEXT PRIMARY KEY,
          count INTEGER NOT NULL DEFAULT 0,
          first_attempt INTEGER NOT NULL DEFAULT 0,
          blocked_until INTEGER
        )
      `);

      addColumnIfMissing(database, "login_rate_limits", "count", "INTEGER NOT NULL DEFAULT 0");
      addColumnIfMissing(database, "login_rate_limits", "first_attempt", "INTEGER NOT NULL DEFAULT 0");
      addColumnIfMissing(database, "login_rate_limits", "blocked_until", "INTEGER");
      database.exec(
        "CREATE INDEX IF NOT EXISTS idx_login_rate_limits_blocked_until ON login_rate_limits(blocked_until)"
      );
    },
  },
  {
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
  },
  {
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
  },
  {
    id: "007_admin_contact_messages_schema",
    description: "Create contact message inbox",
    shouldRun(database) {
      return (
        !tableExists(database, "contact_messages") ||
        hasMissingColumns(database, "contact_messages", [
          "name",
          "reply_to",
          "subject",
          "message",
          "ip_hash",
          "user_agent",
          "created_at",
          "read_at",
        ]) ||
        !indexExists(database, "idx_contact_messages_created_at") ||
        !indexExists(database, "idx_contact_messages_read_at")
      );
    },
    up(database) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS contact_messages (
          contact_id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          reply_to TEXT NOT NULL,
          subject TEXT,
          message TEXT NOT NULL,
          ip_hash TEXT,
          user_agent TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          read_at TEXT
        )
      `);

      addColumnIfMissing(database, "contact_messages", "name", "TEXT NOT NULL DEFAULT ''");
      addColumnIfMissing(database, "contact_messages", "reply_to", "TEXT NOT NULL DEFAULT ''");
      addColumnIfMissing(database, "contact_messages", "subject", "TEXT");
      addColumnIfMissing(database, "contact_messages", "message", "TEXT NOT NULL DEFAULT ''");
      addColumnIfMissing(database, "contact_messages", "ip_hash", "TEXT");
      addColumnIfMissing(database, "contact_messages", "user_agent", "TEXT");
      if (addColumnIfMissing(database, "contact_messages", "created_at", "TEXT")) {
        database.exec("UPDATE contact_messages SET created_at = datetime('now') WHERE created_at IS NULL");
      }
      addColumnIfMissing(database, "contact_messages", "read_at", "TEXT");

      database.exec(
        "CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at)"
      );
      database.exec(
        "CREATE INDEX IF NOT EXISTS idx_contact_messages_read_at ON contact_messages(read_at)"
      );
    },
  },
];

function runMigrations(database, databaseName, migrations, options = {}) {
  ensureSchemaMigrationsTable(database);

  const applied = [];
  for (const migration of migrations) {
    if (!migration.shouldRun(database, options)) continue;

    const run = database.transaction(() => {
      migration.up(database, options);
      recordMigration(database, migration);
    });
    run();
    applied.push({ id: migration.id, description: migration.description });
  }

  const logger = options.logger;
  if (logger) {
    if (applied.length === 0) {
      logger(`[db:migrate] ${databaseName} database up to date`);
    } else {
      for (const migration of applied) {
        logger(`[db:migrate] ${databaseName}: applied ${migration.id} - ${migration.description}`);
      }
    }
  }

  return { databaseName, applied };
}

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
