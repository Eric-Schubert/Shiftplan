import { DEFAULT_LOCALE, isAppLocale, type AppLocale } from "~/i18n/config";

/** A push text, or how to write it in a recipient's language. */
export type Localized<T> = T | ((locale: AppLocale) => T);

export function render<T extends object>(text: Localized<T>, locale: AppLocale): T {
  return typeof text === "function" ? (text as (locale: AppLocale) => T)(locale) : text;
}

/**
 * The language a subscription or device was registered with. Pushes never ask a request for it,
 * a flush has none; rows without a known language get German.
 */
export function recipientLocale(value: unknown): AppLocale {
  return isAppLocale(value) ? value : DEFAULT_LOCALE;
}

/** Recipients by language, in the order they come; with one language that is one group as before. */
export function groupByLocale<T extends { locale?: string | null }>(recipients: T[]): Map<AppLocale, T[]> {
  const groups = new Map<AppLocale, T[]>();
  for (const recipient of recipients) {
    const locale = recipientLocale(recipient.locale);
    const group = groups.get(locale) ?? [];
    group.push(recipient);
    groups.set(locale, group);
  }
  return groups;
}
