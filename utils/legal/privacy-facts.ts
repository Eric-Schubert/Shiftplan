import { retentionPeriods } from "~/shared/utils/retention";
import type { PrivacyFacts } from "~/types/privacy";

/**
 * Used when /api/legal/privacy does not answer: the checked-in periods and cookie names, and
 * Microsoft and the push relay stay listed. One recipient too many is better than one missing.
 */
export const DEFAULT_PRIVACY_FACTS: PrivacyFacts = {
  microsoft: true,
  appPush: true,
  defaultRelay: true,
  relayHost: null,
  retentionDays: retentionPeriods(90),
  session: { durationMinutes: 30, cookieName: "session_token", csrfCookieName: "csrf_token" },
};

/** The facts from an /api/legal/privacy response; missing parts keep their defaults. */
export function toPrivacyFacts(response?: Partial<PrivacyFacts> | null): PrivacyFacts {
  const defaults = DEFAULT_PRIVACY_FACTS;
  return {
    microsoft: response?.microsoft ?? defaults.microsoft,
    appPush: response?.appPush ?? defaults.appPush,
    defaultRelay: response?.defaultRelay ?? defaults.defaultRelay,
    relayHost: response?.relayHost ?? defaults.relayHost,
    retentionDays: { ...defaults.retentionDays, ...response?.retentionDays },
    session: { ...defaults.session, ...response?.session },
  };
}
