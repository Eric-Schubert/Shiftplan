import type de from "./locales/de";

/** The German catalog is the reference: every other locale has the same keys. */
export type Messages = typeof de;

/** Dotted paths to the string messages, e.g. "common.meta.description". Arrays are left out. */
type MessagePaths<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : T[K] extends readonly unknown[] ? never : MessagePaths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type MessageKey = MessagePaths<Messages>;

/** Values for the placeholders of a message. */
export type MessageParams = Record<string, string | number>;

/**
 * A message with its parameters, for code that picks the text and leaves translating to the caller.
 * The server's error references extend it with nested messages and dates (server/utils/api-error.ts).
 */
export type MessageRef<Params = MessageParams> = { key: MessageKey; params?: Params };

// Types the keys of useI18n() and $t() in the app.
declare module "vue-i18n" {
  export interface DefineLocaleMessage extends Messages {}
}
