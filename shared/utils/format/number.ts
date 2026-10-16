import { cached } from "./cache";

/** Sorts names the way the locale does: collator(locale).compare(a, b). */
export function collator(locale: string): Intl.Collator {
  return cached(`collator|${locale}`, () => new Intl.Collator(locale));
}

/** „12.346“ or „1.234,6“ with fraction digits; a missing value (NaN) reads 0. */
export function formatNumber(locale: string, value: number, maximumFractionDigits = 0): string {
  const format = cached(
    `number|${locale}|${maximumFractionDigits}`,
    () => new Intl.NumberFormat(locale, { maximumFractionDigits, minimumFractionDigits: 0 })
  );
  return format.format(value || 0);
}
