import type { MessageKey } from "~/i18n/types";
import { formatDay } from "~/shared/utils/format/day";

type Values = Record<string, string | number>;

export interface RequestErrorI18n {
  /** t() of the app; a numeric `count` picks the plural form. */
  translate: (key: MessageKey, values: Values) => string;
  has: (key: string) => boolean;
  /** Language tag for dates, e.g. „de-DE“. */
  locale: string;
}

/** What the server sends with a failed request (server/utils/api-error.ts). */
interface ErrorBody {
  statusMessage?: unknown;
  data?: { code?: unknown; params?: unknown };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** A catalog message with its parameters; nested messages and dates are rendered in the same language. */
function render(key: string, params: unknown, i18n: RequestErrorI18n): string | null {
  if (!i18n.has(key)) return null;
  const values: Values = {};
  for (const [name, value] of Object.entries(isRecord(params) ? params : {})) {
    if (typeof value === "string" || typeof value === "number") values[name] = value;
    else if (isRecord(value) && typeof value.date === "string") values[name] = formatDay(i18n.locale, value.date);
    else if (isRecord(value) && typeof value.key === "string") values[name] = render(value.key, value.params, i18n) ?? value.key;
  }
  return i18n.translate(key as MessageKey, values);
}

/**
 * The text for a failed request: the catalog message the server named in `data.code`, in the
 * reader's language; else the server's text; else the fallback for the action, e.g. when offline.
 */
export function requestErrorMessage(error: unknown, fallback: MessageKey, i18n: RequestErrorI18n): string {
  const body: ErrorBody | undefined = isRecord(error) && isRecord(error.data) ? (error.data as ErrorBody) : undefined;
  const code = body?.data?.code;
  const fromCode = typeof code === "string" ? render(code, body?.data?.params, i18n) : null;
  if (fromCode) return fromCode;
  if (typeof body?.statusMessage === "string" && body.statusMessage.trim()) return body.statusMessage;
  return i18n.translate(fallback, {});
}

/** The HTTP status of a failed request, if it got an answer. */
export function requestErrorStatus(error: unknown): number | undefined {
  if (!isRecord(error)) return undefined;
  const status = error.statusCode ?? error.status;
  return typeof status === "number" ? status : undefined;
}
