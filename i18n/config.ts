// Locales of the UI and the server texts. German is the reference catalog and the fallback.
export const LOCALES = ["de", "en"] as const;
export type AppLocale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "de";

/**
 * Full language tag per locale for Intl and <html lang>: "de" alone would leave the region to Intl.
 * British English writes day before month and 24-hour times, as shift plans need.
 */
export const LOCALE_TAGS: Record<AppLocale, string> = { de: "de-DE", en: "en-GB" };

/** Each language's name in that language, for the language switcher. */
export const LOCALE_NAMES: Record<AppLocale, string> = { de: "Deutsch", en: "English" };

/**
 * The language a visitor chose in the switcher. Written only on that choice (one year); app and server
 * read it before the browser language.
 */
export const LOCALE_COOKIE = "shiftplan_locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** The language tag the formatters take („de-DE“); unknown locales get the default's. */
export function localeTag(locale: string): string {
  return LOCALE_TAGS[isAppLocale(locale) ? locale : DEFAULT_LOCALE];
}
