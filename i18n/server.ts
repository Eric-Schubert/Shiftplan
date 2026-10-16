import { createCoreContext, translate, type CoreContext } from "@intlify/core";
import { DEFAULT_LOCALE, isAppLocale, type AppLocale } from "./config";
import de from "./locales/de";
import type { MessageKey, Messages } from "./types";

// Server texts (errors, pushes, mails) with the same catalogs and message syntax as the app.
// No Nuxt, Nitro or h3 here: tests import it directly and push flushes run without a request.
const MESSAGES: Record<AppLocale, Messages> = { de };
const contexts = new Map<AppLocale, CoreContext>();
const broken = new Set<string>();

function contextFor(locale: AppLocale): CoreContext {
  let context = contexts.get(locale);
  if (!context) {
    context = createCoreContext({
      locale,
      fallbackLocale: DEFAULT_LOCALE,
      messages: MESSAGES,
      missingWarn: false,
      fallbackWarn: false,
    });
    contexts.set(locale, context);
  }
  return context;
}

export type MessageParams = Record<string, string | number>;

/**
 * The message for `key` in `locale`, falling back to German for unknown locales and missing keys.
 * A numeric `count` picks the plural form („ein Tag | {count} Tage“), like t(key, count) in the app.
 */
export function t(locale: string, key: MessageKey, params: MessageParams = {}): string {
  const context = contextFor(isAppLocale(locale) ? locale : DEFAULT_LOCALE);
  const options = typeof params.count === "number" ? { plural: params.count } : {};
  try {
    const result = translate(context, key, params, options);
    return typeof result === "string" ? result : key;
  } catch (error) {
    // A broken message must not turn a response into a 500; the catalog test should catch it first.
    if (!broken.has(key)) console.warn(`[i18n] Message ${key} does not compile:`, (error as Error).message);
    broken.add(key);
    return key;
  }
}
