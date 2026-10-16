import { renderAuditReason, type AuditReason, type AuditReasonParams } from "~/i18n/audit-reason";
import { DEFAULT_LOCALE, localeTag } from "~/i18n/config";
import { t } from "~/i18n/server";

export type { AuditReason };

/**
 * The reason columns of a new entry: key and values for rendering in the reader's language, plus
 * the German text that older clients and direct database readers know from `reason`.
 */
export function storedReason(reason: AuditReason | undefined): { text: string | null; key: string | null; params: string | null } {
  if (!reason) return { text: null, key: null, params: null };
  const text = renderAuditReason(reason, localeTag(DEFAULT_LOCALE), (key, params) => t(DEFAULT_LOCALE, key, params));
  return { text, key: reason.key, params: JSON.stringify(reason.params) };
}

/** The stored values as an object; anything unreadable counts as none, so the entry shows its text. */
export function readReasonParams(json: string | null): AuditReasonParams | null {
  if (!json) return null;
  try {
    const value: unknown = JSON.parse(json);
    return value && typeof value === "object" && !Array.isArray(value) ? (value as AuditReasonParams) : null;
  } catch {
    return null;
  }
}
