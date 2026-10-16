// 4 Jan 2026 is a Sunday; PrimeVue lists days from Sunday.
const SUNDAY = Date.UTC(2026, 0, 4);
const DAY_MS = 86400000;

function names(locale: string, dates: Date[], options: Intl.DateTimeFormatOptions): string[] {
  const format = new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" });
  return dates.map((date) => format.format(date));
}

/** PrimeVue's day and month names from Intl; the texts Intl cannot provide come from the catalog. */
export function buildPrimeLocale(locale: string, texts: { fileSizeTypes: string[] }) {
  const days = Array.from({ length: 7 }, (_, index) => new Date(SUNDAY + index * DAY_MS));
  const months = Array.from({ length: 12 }, (_, index) => new Date(Date.UTC(2026, index, 15)));
  return {
    firstDayOfWeek: 1,
    dayNames: names(locale, days, { weekday: "long" }),
    dayNamesShort: names(locale, days, { weekday: "short" }),
    dayNamesMin: names(locale, days, { weekday: "narrow" }),
    monthNames: names(locale, months, { month: "long" }),
    monthNamesShort: names(locale, months, { month: "short" }),
    fileSizeTypes: texts.fileSizeTypes,
  };
}
