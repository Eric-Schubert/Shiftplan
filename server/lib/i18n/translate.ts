import errors from "~/i18n/locales/de/errors";
import excel from "~/i18n/locales/de/excel";
import validation from "~/i18n/locales/de/validation";

// The server's own catalog lookup until the i18n module's translator (@intlify/core) takes over.
// Same signature and message syntax, so callers do not change; plurals with `|` are not needed yet.
const messages = { de: { errors, validation, excel } };

export type Locale = keyof typeof messages;
export const DEFAULT_LOCALE: Locale = "de";

type Leaves<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

/** Every dotted catalog key, such as "errors.requests.notFound". */
export type MessageKey = Leaves<(typeof messages)[Locale]>;
export type MessageValues = Record<string, string | number>;

function lookup(locale: Locale, key: string): unknown {
  return key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages[locale]);
}

/** The message at `key` with its `{name}` placeholders filled in; an unknown key comes back as is. */
export function t(locale: Locale, key: MessageKey, params: MessageValues = {}): string {
  const message = lookup(locale, key) ?? lookup(DEFAULT_LOCALE, key);
  if (typeof message !== "string") return key;
  return message.replace(/\{(\w+)\}/g, (placeholder, name: string) => (Object.hasOwn(params, name) ? String(params[name]) : placeholder));
}
