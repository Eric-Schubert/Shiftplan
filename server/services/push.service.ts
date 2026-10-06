import webpush from "web-push";
import { getAdminDatabase, getDatabase } from "~/server/utils/database";
import { getHolidayConfig } from "~/server/config/holiday-config";

const VAPID_PUBLIC_SETTING = "vapid_public_key";
const VAPID_PRIVATE_SETTING = "vapid_private_key";

export const PUSH_MESSAGE_MAX_LENGTH = 240;
const MAX_SUBSCRIPTIONS = 2000;
const MAX_ENDPOINT_LENGTH = 1024;
const MAX_KEY_LENGTH = 256;
const SEND_BATCH_SIZE = 50;
const PUSH_TTL_SECONDS = 12 * 60 * 60;
const MAX_CHANGE_LINES = 4;

// Changes are bundled so a planner editing several slots sends one push.
const CHANGE_QUIET_MS = 60 * 1000;
const CHANGE_MAX_DELAY_MS = 5 * 60 * 1000;

// Only real push services, so subscriptions cannot make the server call arbitrary URLs.
const ALLOWED_PUSH_HOSTS = [
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "web.push.apple.com",
];
const ALLOWED_PUSH_HOST_SUFFIXES = [".push.apple.com", ".notify.windows.com"];

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type PushPayload = {
  title: string;
  body: string;
  url: string;
};

type StoredSubscription = {
  subscription_id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type ShiftChange = {
  year: number;
  week: number;
  shiftId: number;
  staffId: number;
  action: "assign" | "unassign";
};

type PendingChange = {
  year: number;
  week: number;
  shiftName: string;
  shiftOrder: number;
  staffName: string;
  delta: number;
};

const pendingChanges = new Map<string, PendingChange>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let firstPendingAt = 0;
let lastOrigin: string | null = null;

function getSetting(key: string): string | null {
  const row = getAdminDatabase()
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value || null;
}

function setSetting(key: string, value: string): void {
  getAdminDatabase()
    .prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .run(key, value);
}

function getVapidSubject(): string {
  const configured = process.env.SHIFTPLAN_PUSH_SUBJECT?.trim();
  if (configured) return configured;

  const imprintEmail = process.env.NUXT_PUBLIC_IMPRINT_PUBLIC_EMAIL?.trim();
  if (imprintEmail) return `mailto:${imprintEmail}`;

  if (lastOrigin?.startsWith("https://")) return lastOrigin;
  return "mailto:push@shiftplan.invalid";
}

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

function toISOWeek(year: number, month: number, day: number): { year: number; week: number } {
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: date.getUTCFullYear(), week };
}

/** Current and next ISO week in the planning time zone. */
export function getNotifiableWeeks(now = new Date()): Array<{ year: number; week: number }> {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: getHolidayConfig().timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const year = value("year");
  const month = value("month");
  const day = value("day");

  const nextWeekDate = new Date(Date.UTC(year, month - 1, day + 7));
  return [
    toISOWeek(year, month, day),
    toISOWeek(
      nextWeekDate.getUTCFullYear(),
      nextWeekDate.getUTCMonth() + 1,
      nextWeekDate.getUTCDate()
    ),
  ];
}

export function buildChangePayload(changes: PendingChange[]): PushPayload | null {
  const effective = changes
    .filter((change) => change.delta !== 0)
    .sort(
      (a, b) =>
        a.year - b.year ||
        a.week - b.week ||
        a.shiftOrder - b.shiftOrder ||
        a.shiftName.localeCompare(b.shiftName, "de")
    );
  if (effective.length === 0) return null;

  const groups = new Map<string, { label: string; added: string[]; removed: string[] }>();
  for (const change of effective) {
    const key = `${change.year}-${change.week}|${change.shiftName}`;
    const group = groups.get(key) || {
      label: `KW ${change.week} · ${change.shiftName}`,
      added: [],
      removed: [],
    };
    (change.delta > 0 ? group.added : group.removed).push(change.staffName);
    groups.set(key, group);
  }

  const lines = [...groups.values()].map((group) => {
    const parts: string[] = [];
    if (group.added.length > 0) parts.push(`neu: ${group.added.join(", ")}`);
    if (group.removed.length > 0) parts.push(`entfällt: ${group.removed.join(", ")}`);
    return `${group.label}: ${parts.join(" / ")}`;
  });

  const visible = lines.slice(0, MAX_CHANGE_LINES);
  if (lines.length > MAX_CHANGE_LINES) {
    visible.push(`… und ${lines.length - MAX_CHANGE_LINES} weitere Änderungen`);
  }

  const first = effective[0]!;
  return {
    title: "Schichtplan geändert",
    body: visible.join("\n"),
    url: `/?year=${first.year}&week=${first.week}`,
  };
}

export const PushService = {
  getPublicKey(): string {
    const existing = getSetting(VAPID_PUBLIC_SETTING);
    if (existing && getSetting(VAPID_PRIVATE_SETTING)) return existing;

    const keys = webpush.generateVAPIDKeys();
    setSetting(VAPID_PUBLIC_SETTING, keys.publicKey);
    setSetting(VAPID_PRIVATE_SETTING, keys.privateKey);
    return keys.publicKey;
  },

  subscribe(input: unknown): void {
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
    if (!exists && this.countSubscriptions() >= MAX_SUBSCRIPTIONS) {
      throw createError({ statusCode: 429, statusMessage: "Zu viele Push-Abonnements" });
    }

    db.prepare(
      `
        INSERT INTO push_subscriptions (endpoint, p256dh, auth)
        VALUES (?, ?, ?)
        ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth
      `
    ).run(endpoint, subscription!.keys!.p256dh, subscription!.keys!.auth);
  },

  unsubscribe(endpoint: unknown): void {
    if (typeof endpoint !== "string" || endpoint.length > MAX_ENDPOINT_LENGTH) return;
    getAdminDatabase().prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").run(endpoint);
  },

  countSubscriptions(): number {
    const row = getAdminDatabase()
      .prepare("SELECT COUNT(*) AS count FROM push_subscriptions")
      .get() as { count: number };
    return row.count;
  },

  async sendToAll(payload: PushPayload): Promise<{ sent: number; failed: number }> {
    const subscriptions = getAdminDatabase()
      .prepare("SELECT subscription_id, endpoint, p256dh, auth FROM push_subscriptions")
      .all() as StoredSubscription[];
    if (subscriptions.length === 0) return { sent: 0, failed: 0 };

    const vapidDetails = {
      subject: getVapidSubject(),
      publicKey: this.getPublicKey(),
      privateKey: getSetting(VAPID_PRIVATE_SETTING)!,
    };
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
  },

  /**
   * Queues a manual plan change for the bundled push. Changes outside the current
   * and next week are regular planning and stay silent.
   */
  queueShiftChange(change: ShiftChange, origin?: string): void {
    const isNotifiable = getNotifiableWeeks().some(
      (week) => week.year === change.year && week.week === change.week
    );
    if (!isNotifiable) return;

    const db = getDatabase();
    const shift = db
      .prepare("SELECT name, sort_order FROM shifts WHERE shift_id = ?")
      .get(change.shiftId) as { name: string; sort_order: number } | undefined;
    const staff = db
      .prepare("SELECT name FROM staff WHERE staff_id = ?")
      .get(change.staffId) as { name: string } | undefined;
    if (!shift || !staff) return;

    if (origin) lastOrigin = origin;

    const key = `${change.year}-${change.week}|${change.shiftId}|${change.staffId}`;
    const pending = pendingChanges.get(key) || {
      year: change.year,
      week: change.week,
      shiftName: shift.name,
      shiftOrder: shift.sort_order,
      staffName: staff.name,
      delta: 0,
    };
    pending.delta = Math.max(-1, Math.min(1, pending.delta + (change.action === "assign" ? 1 : -1)));
    pendingChanges.set(key, pending);

    const now = Date.now();
    if (!flushTimer) firstPendingAt = now;
    if (flushTimer) clearTimeout(flushTimer);

    const delay = Math.max(0, Math.min(CHANGE_QUIET_MS, firstPendingAt + CHANGE_MAX_DELAY_MS - now));
    flushTimer = setTimeout(() => {
      void this.flushPendingChanges();
    }, delay);
  },

  async flushPendingChanges(): Promise<{ sent: number; failed: number } | null> {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = null;

    const payload = buildChangePayload([...pendingChanges.values()]);
    pendingChanges.clear();
    if (!payload) return null;

    try {
      return await this.sendToAll(payload);
    } catch (error) {
      console.error("[push] Änderungs-Push fehlgeschlagen:", error);
      return null;
    }
  },

  hasPendingChanges(): boolean {
    return pendingChanges.size > 0;
  },
};
