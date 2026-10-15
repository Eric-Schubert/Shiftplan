import { hasValidKeys } from "~/server/services/push/keys";
import type { StoredSubscription } from "~/server/services/push/types";

// Answers that mean this subscription never works: invalid, foreign VAPID key, gone.
// 413 is about the message, not the subscription, and 5xx/429 are temporary.
const DEAD_STATUS_CODES = new Set([400, 403, 404, 410]);
// Unreachable hosts get a few sends, so a short outage keeps the subscription.
const UNREACHABLE_CODES = new Set(["EAI_AGAIN", "ECONNREFUSED"]);
const MAX_UNREACHABLE_SENDS = 3;

const unreachableSends = new Map<number, number>();

export function markDelivered(subscription: StoredSubscription): void {
  unreachableSends.delete(subscription.subscription_id);
}

/**
 * Whether a failed send means the subscription should go. Browsers that are still in use
 * save their subscription again on the next page load, so a wrong call here heals itself.
 */
export function isUndeliverable(reason: unknown, subscription: StoredSubscription): boolean {
  const { statusCode, code } = (reason ?? {}) as { statusCode?: number; code?: string };
  let dead = !hasValidKeys(subscription.p256dh, subscription.auth);
  if (statusCode !== undefined) dead ||= DEAD_STATUS_CODES.has(statusCode);
  else if (code === "ENOTFOUND") dead = true;
  else if (code && UNREACHABLE_CODES.has(code)) {
    const sends = (unreachableSends.get(subscription.subscription_id) ?? 0) + 1;
    unreachableSends.set(subscription.subscription_id, sends);
    dead ||= sends >= MAX_UNREACHABLE_SENDS;
  }
  if (dead) unreachableSends.delete(subscription.subscription_id);
  return dead;
}
