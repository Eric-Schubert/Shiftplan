/** „09.10.2026, 14:30“ for a timestamp or date. */
export function formatTimestamp(value: number | Date): string {
  return new Date(value).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Same for SQLite's UTC text, which carries no zone marker. */
export function formatSqlTimestamp(value: string): string {
  return formatTimestamp(new Date(value + "Z"));
}
