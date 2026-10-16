import { localeTag } from "~/i18n/config";

/** The UI locale as a language tag for the formatters („de-DE“), following locale switches. */
export function useLocaleTag() {
  const { locale } = useI18n();
  return computed(() => localeTag(locale.value));
}
