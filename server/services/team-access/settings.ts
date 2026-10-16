import { randomBytes } from "node:crypto";
import { DEFAULT_LOCALE, isAppLocale, type AppLocale } from "~/i18n/config";
import { getAdminDatabase } from "~/server/utils/database";

const INSTANCE_NAME_SETTING = "instance_name";
const INSTANCE_ID_SETTING = "instance_uid";
const NEXT_WEEK_FROM_SATURDAY_SETTING = "next_week_from_saturday";
const INSTANCE_LOCALE_SETTING = "instance_locale";
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

/** From Saturday on the planner opens next week. Teams with weekend shifts turn this off. */
export function getNextWeekFromSaturday(): boolean {
  return getSetting(NEXT_WEEK_FROM_SATURDAY_SETTING) !== "0";
}

export function setNextWeekFromSaturday(enabled: boolean): void {
  getAdminDatabase()
    .prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .run(NEXT_WEEK_FROM_SATURDAY_SETTING, enabled ? "1" : "0");
}

/** The instance's language: for visitors without a language of their own, the app, mails and pushes. */
export function getInstanceLocale(): AppLocale {
  const locale = getSetting(INSTANCE_LOCALE_SETTING);
  return isAppLocale(locale) ? locale : DEFAULT_LOCALE;
}

export function setInstanceLocale(locale: AppLocale): void {
  getAdminDatabase()
    .prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .run(INSTANCE_LOCALE_SETTING, locale);
}
