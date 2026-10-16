import type { NuxtConfig } from "nuxt/schema";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_TAGS, LOCALES } from "../../i18n/config";

// No URL prefix: links, QR codes, deep links and /datenschutz stay as they are.
// Catalogs load per locale on demand.
export const i18nConfig: NuxtConfig["i18n"] = {
  strategy: "no_prefix",
  defaultLocale: DEFAULT_LOCALE,
  locales: LOCALES.map((code) => ({ code, language: LOCALE_TAGS[code], files: [`${code}/index.ts`] })),
  // Detection reads LOCALE_COOKIE, then the browser language. The module would write the cookie on every
  // first visit with useCookie on; the language switcher writes it only when someone picks a language
  // (composables/useLocaleSwitch.ts), as the privacy policy says. The server reads it too (server/utils/locale.ts).
  detectBrowserLanguage: {
    useCookie: false,
    cookieKey: LOCALE_COOKIE,
    fallbackLocale: DEFAULT_LOCALE,
  },
};
