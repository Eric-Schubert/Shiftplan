import { cached } from "./cache";

/**
 * An ISO 3166 country code written out in the language of the locale: regionName("de-DE", "DE") is
 * „Deutschland“, regionName("en-GB", "DE") "Germany". Anything else, including a code Intl does not
 * know, comes back unchanged.
 */
export function regionName(locale: string, code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return code;
  const names = cached(`region|${locale}`, () => new Intl.DisplayNames(locale, { type: "region", fallback: "none" }));
  return names.of(code.toUpperCase()) ?? code;
}
