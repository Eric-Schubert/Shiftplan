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

export function formatHolidayDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

export function formatHolidayPeriod(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const formatDate = (date: Date) =>
    date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });

  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

export function shortenHolidayName(name: string): string {
  return shortHolidayNames[name] || name;
}

export function buildHolidayBannerItems(
  holidays: PublicHoliday[],
  schoolHolidays: SchoolHolidayPeriod[]
): HolidayBannerItem[] {
  const holidayItems: HolidayBannerItem[] = holidays.map((holiday) => ({
    key: `holiday-${holiday.date}-${holiday.name}`,
    label: holiday.name,
    meta: formatHolidayDate(holiday.date),
    tone: holiday.type === "national" ? "holiday" : "warning",
    states: holiday.states.map((state) => state.name),
  }));

  const schoolItems: HolidayBannerItem[] = schoolHolidays.map((period) => ({
    key: `school-${period.name}-${period.start}`,
    label: period.name,
    meta: formatHolidayPeriod(period.start, period.end),
    tone: "school",
    states: period.states.map((state) => state.name),
  }));

  return [...holidayItems, ...schoolItems];
}
