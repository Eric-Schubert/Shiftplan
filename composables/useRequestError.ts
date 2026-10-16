import type { MessageKey } from "~/i18n/types";
import { requestErrorMessage } from "~/utils/request-error";

/** Turns a failed request into the text to show; call it in setup, use the result anywhere. */
export function useRequestError() {
  const { t, te } = useI18n();
  const localeTag = useLocaleTag();

  return (error: unknown, fallback: MessageKey): string =>
    requestErrorMessage(error, fallback, {
      translate: (key, values) => (typeof values.count === "number" ? t(key, values, values.count) : t(key, values)),
      has: (key) => te(key),
      locale: localeTag.value,
    });
}
