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
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);

  const weekStart = new Date(firstMonday);
  weekStart.setDate(firstMonday.getDate() + (week - 1) * 7);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  return {
    start: weekStart.toISOString().slice(0, 10),
    end: weekEnd.toISOString().slice(0, 10),
  };
}
