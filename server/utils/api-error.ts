import { createError, type H3Event } from "h3";
import { DEFAULT_LOCALE, t, type Locale, type MessageKey, type MessageValues } from "~/server/lib/i18n/translate";
import { localeTag } from "~/i18n/config";
import { resolveLocale } from "~/server/utils/locale";
import { formatDay } from "~/shared/utils/format/day";

/** A parameter that is itself a catalog message, such as a field label; it is translated in the same locale. */
export type MessageRef = { key: MessageKey; params?: ErrorParams };
/** A day as YYYY-MM-DD; the message shows it formatted, `data.params` keeps the ISO date. */
export type DateParam = { date: string };
export type ErrorParams = Record<string, string | number | MessageRef | DateParam>;

export function messageRef(key: MessageKey, params?: ErrorParams): MessageRef {
  return params ? { key, params } : { key };
}

export function dateParam(date: string): DateParam {
  return { date };
}

// Errors deep in services have no request at hand and use the instance's language.
function errorLocale(event: H3Event | null): Locale {
  return event ? resolveLocale(event) : DEFAULT_LOCALE;
}

function render(locale: Locale, key: MessageKey, params: ErrorParams = {}): string {
  const values: MessageValues = {};
  for (const [name, value] of Object.entries(params)) {
    if (typeof value !== "object") values[name] = value;
    else values[name] = "date" in value ? formatDay(localeTag(locale), value.date) : render(locale, value.key, value.params);
  }
  return t(locale, key, values);
}

/**
 * An HTTP error with a catalog message. `statusMessage` carries the text because the app shows it as is;
 * `message` repeats it, so moving off the non-ASCII `statusMessage` later is a one-line change.
 * `data.code` and `data.params` name the message independent of the language.
 * Code without a request at hand passes `null` and gets the default locale.
 */
export function apiError(event: H3Event | null, statusCode: number, key: MessageKey, params?: ErrorParams) {
  const text = render(errorLocale(event), key, params);
  return createError({ statusCode, statusMessage: text, message: text, data: { code: key, params } });
}
