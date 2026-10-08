import { getAdminDatabase } from "~/server/utils/database";
import type { PushSubscriptionInput } from "~/server/services/push/types";

const MAX_SUBSCRIPTIONS = 2000;
const MAX_ENDPOINT_LENGTH = 1024;
const MAX_KEY_LENGTH = 256;

// Only real push services, so subscriptions cannot make the server call arbitrary URLs.
const ALLOWED_PUSH_HOSTS = [
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "web.push.apple.com",
];
const ALLOWED_PUSH_HOST_SUFFIXES = [".push.apple.com", ".notify.windows.com"];

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

function isValidKey(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_KEY_LENGTH &&
    /^[A-Za-z0-9_-]+=*$/.test(value)
  );
}

export function countSubscriptions(): number {
  const row = getAdminDatabase()
    .prepare("SELECT COUNT(*) AS count FROM push_subscriptions")
    .get() as { count: number };
  return row.count;
}

/** A browser signed in as a person also gets that person's own messages. */
export function subscribe(input: unknown, staffId: number | null = null): void {
  const subscription = input as Partial<PushSubscriptionInput> | null;
  const endpoint = subscription?.endpoint;

  if (
    typeof endpoint !== "string" ||
    endpoint.length > MAX_ENDPOINT_LENGTH ||
    !isAllowedEndpoint(endpoint)
  ) {
    throw createError({ statusCode: 400, statusMessage: "Ungültiges Push-Abonnement" });
  }
  if (!isValidKey(subscription?.keys?.p256dh) || !isValidKey(subscription?.keys?.auth)) {
    throw createError({ statusCode: 400, statusMessage: "Ungültiges Push-Abonnement" });
  }

  const db = getAdminDatabase();
  const exists = db
    .prepare("SELECT 1 FROM push_subscriptions WHERE endpoint = ?")
    .get(endpoint);
  if (!exists && countSubscriptions() >= MAX_SUBSCRIPTIONS) {
    throw createError({ statusCode: 429, statusMessage: "Zu viele Push-Abonnements" });
  }

  db.prepare(
    `
      INSERT INTO push_subscriptions (endpoint, p256dh, auth, staff_id)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, staff_id = excluded.staff_id
    `
  ).run(endpoint, subscription!.keys!.p256dh, subscription!.keys!.auth, staffId);
}

export function unsubscribe(endpoint: unknown): void {
  if (typeof endpoint !== "string" || endpoint.length > MAX_ENDPOINT_LENGTH) return;
  getAdminDatabase().prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").run(endpoint);
}
