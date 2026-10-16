import { formatTimestamp } from "~/shared/utils/format/time";

/** „09.10.2026, 14:30“ for SQLite's UTC text, which carries no zone marker. */
export function formatSqlTimestamp(locale: string, value: string): string {
  return formatTimestamp(locale, new Date(value + "Z"));
}
