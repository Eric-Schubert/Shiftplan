export type LocalizedName = Array<{ language: string; text: string }>;

// A hanging API would otherwise hold the request for minutes.
const FETCH_TIMEOUT_MS = 10_000;

/** GET request against the OpenHolidays API, which answers with a JSON list. */
export async function fetchOpenHolidays<T>(url: string): Promise<T[]> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`OpenHolidays API error: ${response.status}`);
  }

  return response.json();
}

/**
 * The name in `language` (holidays.languageIsoCode, a setting of the instance like the country, not the
 * reader's UI language), else the first name the API sent, else the fallback.
 */
export function pickName(name: LocalizedName, language: string, fallback: string): string {
  const wanted = language.trim().toUpperCase();
  return name.find((n) => n.language.toUpperCase() === wanted)?.text || name[0]?.text || fallback;
}

/** The subdivision code without the country prefix: "DE-SN", "de-sn" and "SN" give "SN" for DE, "AT-9" gives "9" for AT. */
export function subdivisionShortCode(value: string, countryIsoCode: string): string {
  const code = value.trim().toUpperCase();
  const prefix = `${countryIsoCode.trim().toUpperCase()}-`;
  return code.startsWith(prefix) ? code.slice(prefix.length) : code;
}
