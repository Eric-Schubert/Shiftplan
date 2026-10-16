import { cached } from "./cache";

/**
 * „09.10.2026, 14:30“ in the given time zone, or else the runtime's zone at first use;
 * an invalid time gives "".
 */
export function formatTimestamp(locale: string, value: number | Date, timeZone?: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const format = cached(
    `timestamp|${locale}|${timeZone ?? ""}`,
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone,
      })
  );
  return format.format(date);
}

/** Words next to now („heute“, „gestern“), numbers beyond („vor 5 Tagen“, never „vorgestern“). */
export function formatRelative(locale: string, value: number, unit: Intl.RelativeTimeFormatUnit): string {
  const numeric = Math.abs(value) <= 1 ? "auto" : "always";
  return cached(`relative|${locale}|${numeric}`, () => new Intl.RelativeTimeFormat(locale, { numeric })).format(value, unit);
}
