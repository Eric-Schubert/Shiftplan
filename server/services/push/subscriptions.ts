import { DEFAULT_LOCALE, type AppLocale } from "~/i18n/config";
import { getAdminDatabase } from "~/server/utils/database";
import { hasValidKeys } from "~/server/services/push/keys";
import type { PushSubscriptionInput } from "~/server/services/push/types";
import { apiError } from "~/server/utils/api-error";

const MAX_SUBSCRIPTIONS = 2000;
const MAX_ENDPOINT_LENGTH = 1024;

// Only real push services, so subscriptions cannot make the server call arbitrary URLs.
const ALLOWED_PUSH_HOSTS = [
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "web.push.apple.com",
];
// Apple's Web Push always uses web.push.apple.com; only Windows needs per-region hosts.
const ALLOWED_PUSH_HOST_SUFFIXES = [".notify.windows.com"];

function isAllowedEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }

  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  return (
    ALLOWED_PUSH_HOSTS.includes(host) ||
    ALLOWED_PUSH_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
  );
}

export function countSubscriptions(): number {
  const row = getAdminDatabase()
    .prepare("SELECT COUNT(*) AS count FROM push_subscriptions")
    .get() as { count: number };
  return row.count;
}

/**
 * A browser signed in as a person also gets that person's own messages. The subscription is
 * bound to that sign-in, so signing out or revoking it removes the subscription too.
 * Pushes reach it in `locale`, the language of the request that subscribed or renewed it.
 */
export function subscribe(
  input: unknown,
  member: { sessionId: string; staffId: number } | null = null,
  locale: AppLocale = DEFAULT_LOCALE
): void {
  const subscription = input as Partial<PushSubscriptionInput> | null;
  const endpoint = subscription?.endpoint;

  if (
    typeof endpoint !== "string" ||
    endpoint.length > MAX_ENDPOINT_LENGTH ||
    !isAllowedEndpoint(endpoint)
  ) {
    throw apiError(null, 400, "errors.push.invalidSubscription");
  }
  if (!hasValidKeys(subscription?.keys?.p256dh, subscription?.keys?.auth)) {
    throw apiError(null, 400, "errors.push.invalidSubscription");
  }

  const db = getAdminDatabase();
  const exists = db
    .prepare("SELECT 1 FROM push_subscriptions WHERE endpoint = ?")
    .get(endpoint);
  if (!exists && countSubscriptions() >= MAX_SUBSCRIPTIONS) {
    throw apiError(null, 429, "errors.push.tooManySubscriptions");
  }

  db.prepare(
    `
      INSERT INTO push_subscriptions (endpoint, p256dh, auth, staff_id, member_session, locale)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        staff_id = excluded.staff_id,
        member_session = excluded.member_session,
        locale = excluded.locale
    `
  ).run(
    endpoint,
    subscription!.keys!.p256dh,
    subscription!.keys!.auth,
    member?.staffId ?? null,
    member?.sessionId ?? null,
    locale
  );
}

export function unsubscribe(endpoint: unknown): void {
  if (typeof endpoint !== "string" || endpoint.length > MAX_ENDPOINT_LENGTH) return;
  getAdminDatabase().prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").run(endpoint);
}
