import { formatDay } from "~/shared/utils/format/day";
import type {
  HolidayBannerItem,
  PublicHoliday,
  SchoolHolidayPeriod,
} from "~/types/holiday";

const shortHolidayNames: Record<string, string> = {
  Neujahr: "Neujahr",
  "Tag der Arbeit": "1. Mai",
  "Tag der Deutschen Einheit": "Einheit",
  "1. Weihnachtstag": "1. Weihn.",
  "2. Weihnachtstag": "2. Weihn.",
  "Erster Weihnachtstag": "1. Weihn.",
  "Zweiter Weihnachtstag": "2. Weihn.",
  Karfreitag: "Karfreitag",
  Ostersonntag: "Ostern",
  Ostermontag: "Ostermo.",
  "Christi Himmelfahrt": "Himmelfahrt",
  Pfingstsonntag: "Pfingsten",
  Pfingstmontag: "Pfingstmo.",
  "Buß- und Bettag": "Buß+Bettag",
  Reformationstag: "Reformation",
};

/** „Do., 08.10.“ */
export function formatHolidayDate(locale: string, date: string): string {
  return formatDay(locale, date, "intl");
}

/** „08.10. – 12.10.“, with both ends also for a one-day period. */
export function formatHolidayPeriod(locale: string, start: string, end: string): string {
  return `${formatDay(locale, start, "date")} – ${formatDay(locale, end, "date")}`;
}

export function shortenHolidayName(name: string): string {
  return shortHolidayNames[name] || name;
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
