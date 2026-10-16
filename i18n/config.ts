// Locales of the UI and the server texts. English follows once its catalog is complete.
export const LOCALES = ["de"] as const;
export type AppLocale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "de";

/** Set by @nuxtjs/i18n when it detects or switches the locale; the server reads it too. */
export const LOCALE_COOKIE = "shiftplan_locale";

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
