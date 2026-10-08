import { vi } from "vitest";
import { createApiClient, type ApiClient, type Route } from "./api-harness";

export const FCM_ENDPOINT = "https://fcm.googleapis.com/fcm/send/device-1";
export const APPLE_ENDPOINT = "https://web.push.apple.com/device-2";

/** Every request to the push relay ends up here. */
export const relayFetch = vi.fn();

const ROUTES: Route[] = [
  ["post", "/api/auth/login", "server/api/auth/login.post"],
  ["get", "/api/shiftplan", "server/api/shiftplan/index.get"],
  ["post", "/api/shiftplan/assign", "server/api/shiftplan/assign.post"],
  ["post", "/api/shiftplan/unassign", "server/api/shiftplan/unassign.post"],
  ["get", "/api/instance", "server/api/instance.get"],
  ["post", "/api/viewer/login", "server/api/viewer/login.post"],
  ["post", "/api/viewer/logout", "server/api/viewer/logout.post"],
  ["post", "/api/push/devices", "server/api/push/devices.post"],
  ["delete", "/api/push/devices", "server/api/push/devices.delete"],
  ["get", "/api/viewer/status", "server/api/viewer/status.get"],
  ["post", "/api/push/subscribe", "server/api/push/subscribe.post"],
  ["post", "/api/push/unsubscribe", "server/api/push/unsubscribe.post"],
  ["get", "/api/push/status", "server/api/push/status.get"],
  ["post", "/api/push/notify", "server/api/push/notify.post"],
  ["get", "/api/team-access", "server/api/team-access/index.get"],
  ["post", "/api/team-access", "server/api/team-access/index.post"],
];

export type PushClient = ApiClient & { push: typeof import("../../server/services/push.service") };

/** The client of the running test, set by openPushClient(). */
export let client: PushClient;

export function stubPushRelay() {
  process.env.SHIFTPLAN_PUSH_RELAY_URL = "https://relay.test";
  vi.stubGlobal("fetch", (...args: unknown[]) => relayFetch(...args));
}

/** Fresh databases with Anna, Max and the Frühschicht. */
export async function openPushClient() {
  const api = await createApiClient(ROUTES, (db) => {
    db.prepare("INSERT INTO staff (name, active, is_parttime) VALUES (?, 1, 0)").run("Anna");
    db.prepare("INSERT INTO staff (name, active, is_parttime) VALUES (?, 1, 0)").run("Max");
    db.prepare(`
      INSERT INTO shifts (name, active, start_time, end_time, color, min_staff, sort_order)
      VALUES ('Frühschicht', 1, '06:00', '14:00', '#22c55e', 1, 1)
    `).run();
  });
  client = { ...api, push: await import("../../server/services/push.service") };
}

export async function closePushClient() {
  await client.push.PushService.flushPendingChanges();
  client.close();
}

export function currentWeek() {
  return client.push.getNotifiableWeeks()[0]!;
}
