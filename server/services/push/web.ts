import webpush from "web-push";
import { getAdminDatabase } from "~/server/utils/database";
import { purgeMemberAccess } from "~/server/services/member-access.service";
import { recipientLocale, render, type Localized } from "~/server/services/push/locales";
import { isUndeliverable, markDelivered } from "~/server/services/push/undeliverable";
import { getVapidDetails } from "~/server/services/push/vapid";
import type { PushPayload, SendCounts, StoredSubscription } from "~/server/services/push/types";

const SEND_BATCH_SIZE = 50;
const PUSH_TTL_SECONDS = 12 * 60 * 60;
// web-push has no default timeout; a stalled push service would hold the request forever.
const SEND_TIMEOUT_MS = 10_000;

/**
 * All browsers, only those of some people (`staffIds`) or all but one person's. Each gets the text
 * in the language it subscribed with, rendered once per language.
 */
export async function sendWebPush(payload: Localized<PushPayload>, filter: { staffIds?: number[]; excludeStaffId?: number } = {}): Promise<SendCounts> {
  purgeMemberAccess();
  const subscriptions = (
    getAdminDatabase().prepare("SELECT subscription_id, endpoint, p256dh, auth, locale, staff_id FROM push_subscriptions").all() as Array<
      StoredSubscription & { staff_id: number | null }
    >
  ).filter((subscription) =>
    filter.staffIds
      ? subscription.staff_id !== null && filter.staffIds.includes(subscription.staff_id)
      : filter.excludeStaffId === undefined || subscription.staff_id !== filter.excludeStaffId
  );
  if (subscriptions.length === 0) return { sent: 0, failed: 0 };

  const vapidDetails = getVapidDetails();
  const bodies = new Map<string, string>();
  const bodyFor = (subscription: StoredSubscription) => {
    const locale = recipientLocale(subscription.locale);
    if (!bodies.has(locale)) bodies.set(locale, JSON.stringify(render(payload, locale)));
    return bodies.get(locale)!;
  };
  const expired: number[] = [];
  let sent = 0;
  let failed = 0;

  for (let index = 0; index < subscriptions.length; index += SEND_BATCH_SIZE) {
    const batch = subscriptions.slice(index, index + SEND_BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((subscription) =>
        webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          bodyFor(subscription),
          { vapidDetails, TTL: PUSH_TTL_SECONDS, urgency: "high", timeout: SEND_TIMEOUT_MS }
        )
      )
    );

    results.forEach((result, resultIndex) => {
      const subscription = batch[resultIndex]!;
      if (result.status === "fulfilled") {
        sent += 1;
        markDelivered(subscription);
        return;
      }

      failed += 1;
      if (isUndeliverable(result.reason, subscription)) {
        expired.push(subscription.subscription_id);
      } else {
        const reason = result.reason as { statusCode?: number; code?: string };
        console.error("[push] Sending failed:", reason?.statusCode || reason?.code || result.reason);
      }
    });
  }

  if (expired.length > 0) {
    const remove = getAdminDatabase().prepare("DELETE FROM push_subscriptions WHERE subscription_id = ?");
    for (const id of expired) remove.run(id);
  }

  return { sent, failed };
}
