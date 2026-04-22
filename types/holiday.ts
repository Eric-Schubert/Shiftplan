export interface PublicHoliday {
  date: string;
  name: string;
  type: "national" | "saxony";
  nationwide: boolean;
}

export interface SchoolHolidayState {
  code: string;
  name: string;
}

export interface SchoolHolidayPeriod {
  name: string;
  start: string;
  end: string;
  states: SchoolHolidayState[];
}

export type HolidayBannerTone = "holiday" | "warning" | "school";

export interface HolidayBannerItem {
  key: string;
  label: string;
  meta: string;
  tone: HolidayBannerTone;
  states: string[];
}
