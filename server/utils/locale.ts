import { getCookie, getHeader, type H3Event } from "h3";
import { DEFAULT_LOCALE, isAppLocale, LOCALE_COOKIE, type AppLocale } from "~/i18n/config";

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
  return ranges.map(({ tag }) => tag.split("-")[0]).find(isAppLocale) ?? null;
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
