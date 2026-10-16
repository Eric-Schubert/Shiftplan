import type { NuxtConfig } from "nuxt/schema";
import { DEFAULT_LOCALE, LOCALE_COOKIE } from "../../i18n/config";

// No URL prefix: links, QR codes, deep links and /datenschutz stay as they are.
// Catalogs load per locale on demand.
export const i18nConfig: NuxtConfig["i18n"] = {
  strategy: "no_prefix",
  defaultLocale: DEFAULT_LOCALE,
  locales: [{ code: "de", language: "de-DE", files: ["de/index.ts"] }],
  // The locale follows the browser. With one locale a cookie would remember nothing, and the privacy
  // policy names only sign-in and access cookies; the language switcher turns it on with its notice.
  // The server already reads LOCALE_COOKIE (server/utils/locale.ts).
  detectBrowserLanguage: {
    useCookie: false,
    cookieKey: LOCALE_COOKIE,
    fallbackLocale: DEFAULT_LOCALE,
  },
};
