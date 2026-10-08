import { datesOfISOWeek } from "~/server/utils/iso-week";

export type LocalizedName = Array<{ language: string; text: string }>;

/** GET request against the OpenHolidays API, which answers with a JSON list. */
export async function fetchOpenHolidays<T>(url: string): Promise<T[]> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`OpenHolidays API error: ${response.status}`);
  }

  return response.json();
}

export function pickGermanName(name: LocalizedName, fallback: string): string {
  return name.find((n) => n.language === "DE")?.text || name[0]?.text || fallback;
}

/** Monday to Sunday of an ISO week, used to narrow holiday lists down to one week. */
export function getWeekDateRange(year: number, week: number): { start: string; end: string } {
  const dates = datesOfISOWeek(year, week);
  return { start: dates[0]!, end: dates[6]! };
}
