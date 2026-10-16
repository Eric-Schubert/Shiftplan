import { DEFAULT_LOCALE, t, type MessageKey, type MessageValues } from "~/server/lib/i18n/translate";

/** A file the reader cannot take. `key` and `params` name its catalog message, the message is the default locale's text. */
export class XlsxError extends Error {
  readonly key: MessageKey;
  readonly params?: MessageValues;

  constructor(key: MessageKey, params?: MessageValues) {
    super(t(DEFAULT_LOCALE, key, params));
    this.key = key;
    this.params = params;
  }
}
