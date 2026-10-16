// Locales of the UI and the server texts. English follows once its catalog is complete.
export const LOCALES = ["de"] as const;
export type AppLocale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "de";

/** Full language tag per locale for Intl and <html lang>: "de" alone would leave the region to Intl. */
export const LOCALE_TAGS: Record<AppLocale, string> = { de: "de-DE" };

/** Set by @nuxtjs/i18n when it detects or switches the locale; the server reads it too. */
export const LOCALE_COOKIE = "shiftplan_locale";

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** The language tag the formatters take („de-DE“); unknown locales get the default's. */
export function localeTag(locale: string): string {
  return LOCALE_TAGS[isAppLocale(locale) ? locale : DEFAULT_LOCALE];
}
