const collators = new Map<string, Intl.Collator>();

/** Sorts names the way the locale does: collator(locale).compare(a, b). */
export function collator(locale: string): Intl.Collator {
  let found = collators.get(locale);
  if (!found) {
    found = new Intl.Collator(locale);
    collators.set(locale, found);
  }
  return found;
}

/** „12.346“ or „1.234,6“ with fraction digits; a missing value (NaN) reads 0. */
export function formatNumber(locale: string, value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits, minimumFractionDigits: 0 }).format(value || 0);
}
