import webpush from "web-push";
import { getAdminDatabase } from "~/server/utils/database";
import { purgeMemberAccess } from "~/server/services/member-access/cleanup";
import { getVapidDetails } from "~/server/services/push/vapid";
import type { PushPayload, SendCounts, StoredSubscription } from "~/server/services/push/types";

const SEND_BATCH_SIZE = 50;
const PUSH_TTL_SECONDS = 12 * 60 * 60;

/** All browsers, only those of some people (`staffIds`) or all but one person's. */
export async function sendWebPush(
  payload: PushPayload,
  filter: { staffIds?: number[]; excludeStaffId?: number } = {}
): Promise<SendCounts> {
  purgeMemberAccess();
  const subscriptions = (
    getAdminDatabase()
      .prepare("SELECT subscription_id, endpoint, p256dh, auth, staff_id FROM push_subscriptions")
      .all() as Array<StoredSubscription & { staff_id: number | null }>
  ).filter((subscription) =>
    filter.staffIds
      ? subscription.staff_id !== null && filter.staffIds.includes(subscription.staff_id)
      : filter.excludeStaffId === undefined || subscription.staff_id !== filter.excludeStaffId
  );
  if (subscriptions.length === 0) return { sent: 0, failed: 0 };

  const vapidDetails = getVapidDetails();
  const body = JSON.stringify(payload);
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
          body,
          { vapidDetails, TTL: PUSH_TTL_SECONDS, urgency: "high" }
        )
      )
    );

    results.forEach((result, resultIndex) => {
      if (result.status === "fulfilled") {
        sent += 1;
        return;
      }

      failed += 1;
      const statusCode = (result.reason as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        expired.push(batch[resultIndex]!.subscription_id);
      } else {
        console.error("[push] Versand fehlgeschlagen:", statusCode || result.reason);
      }
    });
  }

  if (expired.length > 0) {
    const remove = getAdminDatabase().prepare(
      "DELETE FROM push_subscriptions WHERE subscription_id = ?"
    );
    for (const id of expired) remove.run(id);
  }

  return { sent, failed };
}
