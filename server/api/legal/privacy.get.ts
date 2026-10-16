import { getAnalyticsConfig } from "~/server/config/analytics-config";
import { getAuthConfig } from "~/server/config/auth-config";
import { ContactMailService } from "~/server/services/contact-mail.service";
import { DEFAULT_RELAY_URL, getRelayUrl } from "~/server/services/push-relay.service";
import { retentionPeriods } from "~/shared/utils/retention";
import type { PrivacyFacts } from "~/types/privacy";

/** Only the host name: a custom relay address may carry credentials in its user info or path. */
function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname || null;
  } catch {
    return null;
  }
}

/**
 * Deployment facts the privacy policy depends on that only the server knows. The route is
 * public, so it answers with flags, the relay's host name, periods and cookie names only.
 */
export default defineEventHandler((): PrivacyFacts => {
  const relayUrl = getRelayUrl();
  const { durationMinutes, cookies } = getAuthConfig().session;
  return {
    // Contact mails go out through Microsoft Graph, the only provider.
    microsoft: ContactMailService.isConfigured(),
    appPush: relayUrl !== null,
    // ES Software's own relay, which the policy describes in detail.
    defaultRelay: relayUrl === DEFAULT_RELAY_URL,
    relayHost: hostOf(relayUrl),
    retentionDays: retentionPeriods(getAnalyticsConfig().retentionDays),
    session: { durationMinutes, cookieName: cookies.sessionName, csrfCookieName: cookies.csrfName },
  };
});
