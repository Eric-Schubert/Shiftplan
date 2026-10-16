// Server error texts go through the app's translator (i18n/server.ts); this keeps the names they import.
export { t, type MessageParams as MessageValues } from "~/i18n/server";
export { DEFAULT_LOCALE, type AppLocale as Locale } from "~/i18n/config";
export type { MessageKey } from "~/i18n/types";
