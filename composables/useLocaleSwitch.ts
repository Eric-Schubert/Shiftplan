import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, LOCALE_NAMES, LOCALE_TAGS, LOCALES, type AppLocale } from "~/i18n/config";

/**
 * The UI languages, each named in itself, and the switch between them. Only this switch writes the
 * locale cookie, so a visitor who never picks a language gets none.
 */
export function useLocaleSwitch() {
  const { locale, setLocale } = useI18n();
  const cookie = useCookie<string | null>(LOCALE_COOKIE, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
    secure: useRequestURL().protocol === "https:",
  });
  const options = LOCALES.map((code) => ({ code, name: LOCALE_NAMES[code], tag: LOCALE_TAGS[code] }));

  async function choose(code: AppLocale) {
    if (code === locale.value) return;
    cookie.value = code;
    await setLocale(code);
  }

  return { locale, options, choose };
}
