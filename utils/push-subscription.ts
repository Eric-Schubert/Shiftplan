// Browser push: what the bell may claim, given the browser's subscription and what the server accepted.

export type PushState = "loading" | "unsupported" | "needs-install" | "denied" | "off" | "on" | "failed";

export function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes;
}

/** Whether a subscription was made with the server's current key; one made with an older key never receives anything. */
export function subscribedWithKey(subscriptionKey: ArrayBuffer | null | undefined, publicKey: string): boolean {
  if (!subscriptionKey) return true;
  const current = urlBase64ToUint8Array(publicKey);
  const subscribed = new Uint8Array(subscriptionKey);
  return subscribed.length === current.length && subscribed.every((byte, index) => byte === current[index]);
}

export interface SubscriptionSync {
  subscription: PushSubscription | null;
  /** The server's current key, if known. */
  publicKey: string | null | undefined;
  /** Without team access the server refuses every subscription; the plan page syncs again once the gate opens. */
  hasAccess: boolean;
  /** Registers the subscription with the server; rejects when the server refuses it. */
  save: (subscription: PushSubscription) => Promise<unknown>;
  /** A fresh subscription for the given server key. */
  renew: (publicKey: string) => Promise<PushSubscription>;
}

/**
 * "on" only once the server has confirmed the browser's subscription. One made with an older key is replaced
 * once; when the server refuses or the renewal fails, "failed" says so instead of claiming pushes that never come.
 */
export async function confirmedPushState(sync: SubscriptionSync): Promise<PushState> {
  let { subscription } = sync;
  if (!subscription) return "off";
  if (!sync.hasAccess) return "loading";
  try {
    if (sync.publicKey && !subscribedWithKey(subscription.options.applicationServerKey, sync.publicKey)) {
      await subscription.unsubscribe().catch(() => false);
      subscription = await sync.renew(sync.publicKey);
    }
    await sync.save(subscription);
    return "on";
  } catch {
    return "failed";
  }
}
