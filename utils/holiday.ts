import { formatDay } from "~/shared/utils/format/day";
import type { MessageKey } from "~/i18n/types";
import type {
  HolidayBannerItem,
  PublicHoliday,
  SchoolHolidayPeriod,
} from "~/types/holiday";

/** Short-name keys by the holiday name the holiday API sends (German); the names are data, not UI text. */
export const SHORT_NAME_KEYS: Record<string, MessageKey> = {
  Neujahr: "holidays.short.newYear",
  "Tag der Arbeit": "holidays.short.labourDay",
  "Tag der Deutschen Einheit": "holidays.short.germanUnity",
  "1. Weihnachtstag": "holidays.short.christmasDay",
  "2. Weihnachtstag": "holidays.short.boxingDay",
  "Erster Weihnachtstag": "holidays.short.christmasDay",
  "Zweiter Weihnachtstag": "holidays.short.boxingDay",
  Karfreitag: "holidays.short.goodFriday",
  Ostersonntag: "holidays.short.easterSunday",
  Ostermontag: "holidays.short.easterMonday",
  "Christi Himmelfahrt": "holidays.short.ascension",
  Pfingstsonntag: "holidays.short.whitSunday",
  Pfingstmontag: "holidays.short.whitMonday",
  "Buß- und Bettag": "holidays.short.repentance",
  Reformationstag: "holidays.short.reformation",
};

/** „Do., 08.10.“ */
export function formatHolidayDate(locale: string, date: string): string {
  return formatDay(locale, date, "intl");
}

/** „08.10. – 12.10.“, with both ends also for a one-day period. */
export function formatHolidayPeriod(locale: string, start: string, end: string): string {
  return `${formatDay(locale, start, "date")} – ${formatDay(locale, end, "date")}`;
}

/** The short name for the week grid, or the name itself when there is none. */
export function shortenHolidayName(name: string, translate: (key: MessageKey) => string): string {
  const key = SHORT_NAME_KEYS[name];
  return key ? translate(key) : name;
}

export function buildHolidayBannerItems(
  locale: string,
  holidays: PublicHoliday[],
  schoolHolidays: SchoolHolidayPeriod[]
): HolidayBannerItem[] {
  const holidayItems: HolidayBannerItem[] = holidays.map((holiday) => ({
    key: `holiday-${holiday.date}-${holiday.name}`,
    label: holiday.name,
    meta: formatHolidayDate(locale, holiday.date),
    tone: holiday.type === "national" ? "holiday" : "warning",
    states: holiday.states.map((state) => state.name),
  }));

  const schoolItems: HolidayBannerItem[] = schoolHolidays.map((period) => ({
    key: `school-${period.name}-${period.start}`,
    label: period.name,
    meta: formatHolidayPeriod(locale, period.start, period.end),
    tone: "school",
    states: period.states.map((state) => state.name),
  }));

  return [...holidayItems, ...schoolItems];
}
