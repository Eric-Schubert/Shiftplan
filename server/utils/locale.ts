import { getCookie, getHeader, type H3Event } from "h3";
import fs from "node:fs";
import { DEFAULT_LOCALE, isAppLocale, LOCALE_COOKIE, localeTag, type AppLocale } from "~/i18n/config";
import { getDatabasePaths } from "~/server/config/database-config";
import { getAdminDatabase } from "~/server/utils/database";

/** Admin setting with the instance's language, written under Team access (team-access/settings.ts). */
export const INSTANCE_LOCALE_SETTING = "instance_locale";

/** The supported locale of one language tag: "de", "de-AT" and Flutter's "de_DE" all give "de". */
export function localeFromTag(tag: unknown): AppLocale | null {
  if (typeof tag !== "string") return null;
  const language = tag.trim().replace(/_/g, "-").split("-")[0]!.toLowerCase();
  return isAppLocale(language) ? language : null;
}

/** The best supported locale of an Accept-Language header, by quality and then order; "de-AT" matches "de". */
export function localeFromAcceptLanguage(header: string | null | undefined): AppLocale | null {
  const ranges = (header ?? "")
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const quality = params.map((param) => param.trim()).find((param) => param.startsWith("q="));
      return { tag: tag.trim().toLowerCase(), quality: quality ? Number(quality.slice(2)) : 1, index };
    })
    .filter((range) => range.tag && range.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);
  return ranges.map(({ tag }) => localeFromTag(tag)).find((locale) => locale !== null) ?? null;
}

/**
 * Locale for texts rendered for this request: the locale cookie the switcher sets, then Accept-Language,
 * then the instance's language. The Flutter app sends neither, so it gets the instance's.
 */
export function resolveLocale(event: H3Event): AppLocale {
  const cookie = getCookie(event, LOCALE_COOKIE);
  if (isAppLocale(cookie)) return cookie;
  return localeFromAcceptLanguage(getHeader(event, "accept-language")) ?? instanceLocale();
}

/**
 * Locale for texts that no request asked for, such as the contact mail to the operator: the language
 * the admin set for the instance, German by default.
 */
export function instanceLocale(): AppLocale {
  // Without an admin database (before setup.js, in tests without one) there is no setting to read,
  // and opening it here would create one.
  if (!fs.existsSync(getDatabasePaths().admin)) return DEFAULT_LOCALE;
  const row = getAdminDatabase().prepare("SELECT value FROM settings WHERE key = ?").get(INSTANCE_LOCALE_SETTING) as { value: string } | undefined;
  return isAppLocale(row?.value) ? row.value : DEFAULT_LOCALE;
}

/** Language tag of the instance's language, for the formatters: pushes, stored audit notes, service errors. */
export function instanceLocaleTag(): string {
  return localeTag(instanceLocale());
}
