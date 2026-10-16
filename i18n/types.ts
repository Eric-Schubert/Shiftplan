import type de from "./locales/de";

/** The German catalog is the reference: every other locale has the same keys. */
export type Messages = typeof de;

/** Dotted paths to the string messages, e.g. "common.meta.description". Arrays are left out. */
type MessagePaths<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : T[K] extends readonly unknown[]
      ? never
      : MessagePaths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type MessageKey = MessagePaths<Messages>;

// Types the keys of useI18n() and $t() in the app.
declare module "vue-i18n" {
  export interface DefineLocaleMessage extends Messages {}
}
