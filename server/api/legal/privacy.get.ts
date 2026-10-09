import { getContactMailConfig } from "~/server/services/contact-mail/config";
import { getRelayUrl } from "~/server/services/push-relay.service";

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
 * public, so it answers with flags and the relay's host name only.
 */
export default defineEventHandler(() => {
  let microsoft = false;
  try {
    microsoft = getContactMailConfig() !== null;
  } catch {
    // Incomplete mail settings never send anything to Microsoft.
  }
  const relayUrl = getRelayUrl();
  return { microsoft, appPush: relayUrl !== null, relayHost: hostOf(relayUrl) };
});
