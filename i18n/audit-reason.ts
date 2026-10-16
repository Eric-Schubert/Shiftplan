import { formatDay, formatDayRange } from "~/shared/utils/format/day";
import { weekOfYearLabel } from "~/shared/utils/format/week";
import type de from "./locales/de";
import type { MessageKey, MessageRef } from "./types";

// Audit entries store their reason as a catalog key with plain values (names, counts, ISO dates)
// and are rendered in the reader's language. The German text the server stores next to them for
// older clients comes from the same function, so the two always read the same.

export type AuditReasonKey = `audit.reason.${keyof typeof de.audit.reason & string}`;
export type AuditReasonParams = Record<string, string | number>;
/** A MessageRef into `audit.reason`, always with its values. */
export type AuditReason = MessageRef & { key: AuditReasonKey; params: AuditReasonParams };
/** t() of the app or the server: a numeric `count` picks the plural form. */
export type Translate = (key: MessageKey, params: AuditReasonParams) => string;

/** Dates and weeks are written in the reader's format: `date` as {day}, `from`–`to` as {days}, `year`/`week` as {weekOfYear}. */
function shownParams(params: AuditReasonParams, tag: string): AuditReasonParams {
  const shown = { ...params };
  if (typeof params.date === "string") shown.day = formatDay(tag, params.date, "weekday-date");
  if (typeof params.from === "string" && typeof params.to === "string") {
    shown.days = formatDayRange(tag, params.from, params.to, "weekday-date");
  }
  if (typeof params.year === "number" && typeof params.week === "number") {
    shown.weekOfYear = weekOfYearLabel(tag, params.year, params.week);
  }
  return shown;
}

export function renderAuditReason(reason: AuditReason, tag: string, translate: Translate): string {
  return translate(reason.key, shownParams(reason.params, tag));
}

export type StoredReason = { reason: string | null; reason_key: string | null; reason_params: AuditReasonParams | null };

/**
 * The reason an entry shows: rendered from its key, or the stored text for entries written before
 * keys existed and for keys the catalog no longer has.
 */
export function entryReason(entry: StoredReason, tag: string, translate: Translate, known: (key: string) => boolean): string | null {
  const { reason_key: key, reason_params: params } = entry;
  if (!key?.startsWith("audit.reason.") || !known(key) || !params) return entry.reason;
  return renderAuditReason({ key: key as AuditReasonKey, params }, tag, translate);
}
