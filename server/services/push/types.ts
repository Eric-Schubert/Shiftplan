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

export type StoredSubscription = {
  subscription_id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  /** Language the pushes are written in. */
  locale: string;
};

export type ShiftChange = {
  year: number;
  week: number;
  shiftId: number;
  staffId: number;
  action: "assign" | "unassign";
  /** Set for a change that only affects one day (YYYY-MM-DD). */
  date?: string;
};

export type PendingChange = {
  year: number;
  week: number;
  /** YYYY-MM-DD for a change of a single day. */
  date?: string;
  /** The shift's name; the push adds the date of a day change in the recipient's language. */
  shiftName: string;
  shiftOrder: number;
  staffId: number;
  staffName: string;
  delta: number;
};

export type StoredDevice = {
  token: string;
  staff_id: number | null;
  scope: DeviceScope;
  /** 1 when registered with a personal app sign-in, 0 for a team device. */
  personal: 0 | 1;
  /** Language the pushes are written in; without one, German. */
  locale?: string;
};

export type SendCounts = { sent: number; failed: number };
