import { formatNoticeDay } from "~/server/utils/absence-notice";
import webpush from "web-push";
import { getAdminDatabase, getDatabase } from "~/server/utils/database";
import { getHolidayConfig } from "~/server/config/holiday-config";
import { PushRelayService, type NativeMessage } from "~/server/services/push-relay.service";
import { TeamAccessService } from "~/server/services/team-access.service";
import { toISOWeek } from "~/server/utils/iso-week";

const VAPID_PUBLIC_SETTING = "vapid_public_key";
const VAPID_PRIVATE_SETTING = "vapid_private_key";

export const PUSH_MESSAGE_MAX_LENGTH = 240;
const MAX_SUBSCRIPTIONS = 2000;
const MAX_DEVICES = 5000;
const MAX_DEVICE_TOKEN_LENGTH = 4096;
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

export type DevicePlatform = "ios" | "android";
export type DeviceScope = "all" | "mine";

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
  /** Set for a change that only affects one day (YYYY-MM-DD). */
  date?: string;
};

type PendingChange = {
  year: number;
  week: number;
  shiftName: string;
  shiftOrder: number;
  staffId: number;
  staffName: string;
  delta: number;
};

type StoredDevice = {
  token: string;
  staff_id: number | null;
  scope: DeviceScope;
};

type SendCounts = { sent: number; failed: number };

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

function sortChanges(changes: PendingChange[]): PendingChange[] {
  return [...changes].sort(
    (a, b) =>
      a.year - b.year ||
      a.week - b.week ||
      a.shiftOrder - b.shiftOrder ||
      a.shiftName.localeCompare(b.shiftName, "de")
  );
}

/** "KW 41: Frühschicht, Spätschicht · KW 42: Nacht" without any staff names. */
function summarizeShifts(changes: PendingChange[]): string {
  const weeks = new Map<string, { week: number; shifts: string[] }>();
  for (const change of sortChanges(changes)) {
    const key = `${change.year}-${change.week}`;
    const entry = weeks.get(key) || { week: change.week, shifts: [] };
    if (!entry.shifts.includes(change.shiftName)) entry.shifts.push(change.shiftName);
    weeks.set(key, entry);
  }
  return [...weeks.values()].map((entry) => `KW ${entry.week}: ${entry.shifts.join(", ")}`).join(" · ");
}

/**
 * App pushes go through Google/Apple without end-to-end encryption, so they only
 * name weeks and shifts. Devices with "only mine" hear about their own shifts.
 */
export function buildNativeMessages(
  changes: PendingChange[],
  devices: StoredDevice[],
  instanceId: string
): NativeMessage[] {
  const effective = changes.filter((change) => change.delta !== 0);
  if (effective.length === 0 || devices.length === 0) return [];

  const dataFor = (relevant: PendingChange[]) => {
    const first = sortChanges(relevant)[0]!;
    return {
      instanceId,
      url: `/?year=${first.year}&week=${first.week}`,
      year: String(first.year),
      week: String(first.week),
    };
  };

  const messages = new Map<string, NativeMessage>();
  const add = (title: string, relevant: PendingChange[], token: string) => {
    const body = summarizeShifts(relevant);
    const key = `${title}|${body}`;
    const message: NativeMessage = messages.get(key) || {
      title,
      body,
      data: dataFor(relevant),
      tokens: [],
    };
    message.tokens.push(token);
    messages.set(key, message);
  };

  for (const device of devices) {
    if (device.scope === "all") {
      add("Schichtplan geändert", effective, device.token);
      continue;
    }
    const own = effective.filter((change) => change.staffId === device.staff_id);
    if (own.length > 0) add("Deine Schicht hat sich geändert", own, device.token);
  }

  return [...messages.values()];
}

function relayInstance() {
  return {
    name: TeamAccessService.getInstanceName(),
    url: lastOrigin?.startsWith("https://") ? lastOrigin : null,
  };
}

function listDevices(): StoredDevice[] {
  return getAdminDatabase()
    .prepare("SELECT token, staff_id, scope FROM push_devices")
    .all() as StoredDevice[];
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

  /** A browser signed in as a person also gets that person's own messages. */
  subscribe(input: unknown, staffId: number | null = null): void {
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
        INSERT INTO push_subscriptions (endpoint, p256dh, auth, staff_id)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, staff_id = excluded.staff_id
      `
    ).run(endpoint, subscription!.keys!.p256dh, subscription!.keys!.auth, staffId);
  },

  unsubscribe(endpoint: unknown): void {
    if (typeof endpoint !== "string" || endpoint.length > MAX_ENDPOINT_LENGTH) return;
    getAdminDatabase().prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").run(endpoint);
  },

  /** Native app device with its FCM token. Re-registering updates staff and scope. */
  /**
   * A device registered with a personal app session always belongs to that person;
   * the client cannot claim someone else.
   */
  registerDevice(input: unknown, member?: { sessionId: string; staffId: number }): void {
    const device = input as {
      platform?: unknown;
      token?: unknown;
      staffId?: unknown;
      scope?: unknown;
    } | null;
    const invalid = (message: string) => createError({ statusCode: 400, statusMessage: message });

    if (device?.platform !== "ios" && device?.platform !== "android") {
      throw invalid("Unbekannte Plattform");
    }
    const token = device.token;
    if (
      typeof token !== "string" ||
      token.length === 0 ||
      token.length > MAX_DEVICE_TOKEN_LENGTH ||
      !/^[A-Za-z0-9:_-]+$/.test(token)
    ) {
      throw invalid("Ungültiges Geräte-Token");
    }

    if (device.scope !== undefined && device.scope !== "all" && device.scope !== "mine") {
      throw invalid("Ungültiger Benachrichtigungsumfang");
    }
    const scope: DeviceScope = device.scope === "mine" ? "mine" : "all";

    let staffId: number | null = member?.staffId ?? null;
    if (!member && device.staffId !== undefined && device.staffId !== null) {
      const exists =
        Number.isInteger(device.staffId) &&
        getDatabase().prepare("SELECT 1 FROM staff WHERE staff_id = ?").get(device.staffId);
      if (!exists) throw invalid("Unbekannter Mitarbeiter");
      staffId = device.staffId as number;
    }
    if (scope === "mine" && staffId === null) {
      throw invalid("Für „nur meine Schichten“ fehlt der Mitarbeiter");
    }

    const db = getAdminDatabase();
    const exists = db.prepare("SELECT 1 FROM push_devices WHERE token = ?").get(token);
    if (!exists && this.countDevices() >= MAX_DEVICES) {
      throw createError({ statusCode: 429, statusMessage: "Zu viele registrierte Geräte" });
    }

    db.prepare(
      `
        INSERT INTO push_devices (platform, token, staff_id, scope, member_session)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(token) DO UPDATE SET
          platform = excluded.platform,
          staff_id = excluded.staff_id,
          scope = excluded.scope,
          member_session = excluded.member_session,
          updated_at = datetime('now')
      `
    ).run(device.platform, token, staffId, scope, member?.sessionId ?? null);
  },

  removeDevice(token: unknown): void {
    if (typeof token !== "string" || token.length > MAX_DEVICE_TOKEN_LENGTH) return;
    getAdminDatabase().prepare("DELETE FROM push_devices WHERE token = ?").run(token);
  },

  countDevices(): number {
    const row = getAdminDatabase()
      .prepare("SELECT COUNT(*) AS count FROM push_devices")
      .get() as { count: number };
    return row.count;
  },

  countSubscriptions(): number {
    const row = getAdminDatabase()
      .prepare("SELECT COUNT(*) AS count FROM push_subscriptions")
      .get() as { count: number };
    return row.count;
  },

  /** Browsers with Web Push plus devices with the app. */
  countRecipients(): number {
    return this.countSubscriptions() + this.countDevices();
  },

  /** Team message from a planner: browsers and app devices get the same text. */
  async sendToAll(payload: PushPayload): Promise<SendCounts> {
    const web = await this.sendWebPush(payload);
    const tokens = listDevices().map((device) => device.token);
    const native = await this.sendNative([
      {
        title: payload.title,
        body: payload.body,
        data: { instanceId: TeamAccessService.getInstanceId(), url: payload.url },
        tokens,
      },
    ]);
    return { sent: web.sent + native.sent, failed: web.failed + native.failed };
  },

  /**
   * Message to the whole team about an absence. The absent person's own devices are skipped;
   * the reason is never part of it.
   */
  async sendTeamNotice(
    payload: PushPayload & { year: number; week: number },
    options: { excludeStaffId?: number } = {}
  ): Promise<SendCounts> {
    const web = await this.sendWebPush(payload, { excludeStaffId: options.excludeStaffId });
    const tokens = listDevices()
      .filter((device) => options.excludeStaffId === undefined || device.staff_id !== options.excludeStaffId)
      .map((device) => device.token);
    const native = await this.sendNative([
      {
        title: payload.title,
        body: payload.body,
        data: {
          instanceId: TeamAccessService.getInstanceId(),
          url: payload.url,
          year: String(payload.year),
          week: String(payload.week),
        },
        tokens,
      },
    ]);
    return { sent: web.sent + native.sent, failed: web.failed + native.failed };
  },

  /**
   * Message to specific people, e.g. the partner of a swap request: their app devices and
   * browsers signed in as them. Team-wide browsers are not reached.
   */
  async sendToStaff(staffIds: number[], payload: PushPayload & { kind?: string }): Promise<SendCounts> {
    const wanted = new Set(staffIds);
    const web = await this.sendWebPush(payload, { staffIds });
    const tokens = listDevices()
      .filter((device) => device.staff_id !== null && wanted.has(device.staff_id))
      .map((device) => device.token);
    if (tokens.length === 0) return web;
    const native = await this.sendNative([
      {
        title: payload.title,
        body: payload.body,
        data: {
          instanceId: TeamAccessService.getInstanceId(),
          url: payload.url,
          ...(payload.kind ? { kind: payload.kind } : {}),
        },
        tokens,
      },
    ]);
    return { sent: web.sent + native.sent, failed: web.failed + native.failed };
  },

  async sendNative(messages: NativeMessage[]): Promise<SendCounts> {
    const result = await PushRelayService.send(messages, relayInstance());
    for (const token of result.invalidTokens) this.removeDevice(token);
    return { sent: result.sent, failed: result.failed };
  },

  /** All browsers, only those of some people (`staffIds`) or all but one person's. */
  async sendWebPush(
    payload: PushPayload,
    filter: { staffIds?: number[]; excludeStaffId?: number } = {}
  ): Promise<SendCounts> {
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

    const key = `${change.year}-${change.week}|${change.shiftId}|${change.staffId}|${change.date ?? ""}`;
    const pending = pendingChanges.get(key) || {
      year: change.year,
      week: change.week,
      // A day change reads „Früh Di. 13.10.“ so it groups apart from the whole week.
      shiftName: change.date ? `${shift.name} ${formatNoticeDay(change.date)}` : shift.name,
      shiftOrder: shift.sort_order,
      staffId: change.staffId,
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

  async flushPendingChanges(): Promise<SendCounts | null> {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = null;

    const changes = [...pendingChanges.values()];
    pendingChanges.clear();
    const payload = buildChangePayload(changes);
    if (!payload) return null;

    try {
      const web = await this.sendWebPush(payload);
      const native = await this.sendNative(
        buildNativeMessages(changes, listDevices(), TeamAccessService.getInstanceId())
      );
      return { sent: web.sent + native.sent, failed: web.failed + native.failed };
    } catch (error) {
      console.error("[push] Änderungs-Push fehlgeschlagen:", error);
      return null;
    }
  },

  hasPendingChanges(): boolean {
    return pendingChanges.size > 0;
  },
};
