import { getCookie, getHeader, type H3Event } from "h3";
import { DEFAULT_LOCALE, isAppLocale, LOCALE_COOKIE, localeTag, type AppLocale } from "~/i18n/config";

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
 * Locale for texts rendered for this request: the locale cookie the app sets, then Accept-Language,
 * then German. The Flutter app sends neither, so it gets German.
 */
export function resolveLocale(event: H3Event): AppLocale {
  const cookie = getCookie(event, LOCALE_COOKIE);
  if (isAppLocale(cookie)) return cookie;
  return localeFromAcceptLanguage(getHeader(event, "accept-language")) ?? DEFAULT_LOCALE;
}

/**
 * Language tag for texts that no request asked for: pushes, stored audit notes, error texts deep in
 * services. That is the instance's language, German until instances get a language setting.
 */
export function instanceLocaleTag(): string {
  return localeTag(DEFAULT_LOCALE);
}
