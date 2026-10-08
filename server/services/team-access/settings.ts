import { randomBytes } from "crypto";
import { getAdminDatabase } from "~/server/utils/database";

const INSTANCE_NAME_SETTING = "instance_name";
const INSTANCE_ID_SETTING = "instance_uid";
const DEFAULT_INSTANCE_NAME = "Schichtplaner";

export function getSetting(key: string): string | null {
  const row = getAdminDatabase()
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value || null;
}

/** Stable random ID, so the app can tell which saved instance a push belongs to. */
export function getInstanceId(): string {
  const existing = getSetting(INSTANCE_ID_SETTING);
  if (existing) return existing;

  const id = randomBytes(12).toString("base64url");
  getAdminDatabase()
    .prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)")
    .run(INSTANCE_ID_SETTING, id);
  return getSetting(INSTANCE_ID_SETTING)!;
}

export function getInstanceName(): string {
  return getSetting(INSTANCE_NAME_SETTING) || DEFAULT_INSTANCE_NAME;
}

export function setInstanceName(name: string): void {
  getAdminDatabase()
    .prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .run(INSTANCE_NAME_SETTING, name);
}
