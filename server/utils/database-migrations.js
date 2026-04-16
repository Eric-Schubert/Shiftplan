import bcrypt from "bcryptjs";

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

function normalizePasswordHash(password) {
  const value = typeof password === "string" && password.length > 0 ? password : "admin";
  return /^\$2[aby]\$\d{2}\$/.test(value) ? value : bcrypt.hashSync(value, 10);
}

function getLegacyAdminPassword(database) {
  if (!tableExists(database, "settings")) return undefined;
  return database
    .prepare("SELECT value FROM settings WHERE key = 'admin_password'")
    .get()?.value;
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
      database.exec(`UPDATE rotation_config SET start_year = CAST(strftime('%Y', 'now') AS INTEGER) WHERE start_year IS NULL`);
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
    up(database) {
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

      const defaultPasswordHash = normalizePasswordHash(getLegacyAdminPassword(database));
      database
        .prepare("UPDATE users SET password_hash = ? WHERE password_hash IS NULL OR password_hash = ''")
        .run(defaultPasswordHash);

      database.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)");
    },
  },
  {
    id: "003_admin_seed_default_user",
    description: "Seed admin user from legacy settings or default credentials",
    shouldRun(database) {
      if (!tableExists(database, "users")) return true;
      const existingUsers = database.prepare("SELECT COUNT(*) AS count FROM users").get();
      return existingUsers.count === 0;
    },
    up(database) {
      const legacyPassword = getLegacyAdminPassword(database);
      const passwordHash = normalizePasswordHash(legacyPassword);

      database
        .prepare(
          "INSERT INTO users (username, password_hash, role, active, created_at) VALUES (?, ?, 'admin', 1, datetime('now'))"
        )
        .run("admin", passwordHash);

      if (!legacyPassword) {
        database
          .prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)")
          .run("admin_password", passwordHash);
      }
    },
  },
];

function runMigrations(database, databaseName, migrations, options = {}) {
  ensureSchemaMigrationsTable(database);

  const applied = [];
  for (const migration of migrations) {
    if (!migration.shouldRun(database)) continue;

    const run = database.transaction(() => {
      migration.up(database);
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
  tableExists,
  normalizePasswordHash,
};
