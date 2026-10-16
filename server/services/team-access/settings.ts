import { randomBytes } from "node:crypto";
import type { AppLocale } from "~/i18n/config";
import { t } from "~/i18n/server";
import { getAdminDatabase } from "~/server/utils/database";
import { INSTANCE_LOCALE_SETTING, instanceLocale } from "~/server/utils/locale";

const INSTANCE_NAME_SETTING = "instance_name";
const INSTANCE_ID_SETTING = "instance_uid";
const NEXT_WEEK_FROM_SATURDAY_SETTING = "next_week_from_saturday";

export function getSetting(key: string): string | null {
  const row = getAdminDatabase().prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value || null;
}

/** Stable random ID, so the app can tell which saved instance a push belongs to. */
export function getInstanceId(): string {
  const existing = getSetting(INSTANCE_ID_SETTING);
  if (existing) return existing;

  const id = randomBytes(12).toString("base64url");
  getAdminDatabase().prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run(INSTANCE_ID_SETTING, id);
  return getSetting(INSTANCE_ID_SETTING)!;
}

/**
 * The name the planner gave the instance. Without one, the default is a UI text in `locale`; it is never
 * stored. Texts nobody asked for in a language, such as the name the push relay gets, use the instance's.
 */
export function getInstanceName(locale: string = instanceLocale()): string {
  return getSetting(INSTANCE_NAME_SETTING) || t(locale, "app.instance.defaultName");
}

export function setInstanceName(name: string): void {
  getAdminDatabase()
    .prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(INSTANCE_NAME_SETTING, name);
}

/** From Saturday on the planner opens next week. Teams with weekend shifts turn this off. */
export function getNextWeekFromSaturday(): boolean {
  return getSetting(NEXT_WEEK_FROM_SATURDAY_SETTING) !== "0";
}

export function setNextWeekFromSaturday(enabled: boolean): void {
  getAdminDatabase()
    .prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(NEXT_WEEK_FROM_SATURDAY_SETTING, enabled ? "1" : "0");
}

/** The instance's language; instanceLocale() in server/utils/locale.ts reads it for every feature. */
export function setInstanceLocale(locale: AppLocale): void {
  getAdminDatabase()
    .prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(INSTANCE_LOCALE_SETTING, locale);
}
