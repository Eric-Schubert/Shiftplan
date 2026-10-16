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
