import { vi } from "vitest";
import { createApiClient, type ApiClient } from "./api-harness";
import { apiRoutes } from "./routes";

export const FCM_ENDPOINT = "https://fcm.googleapis.com/fcm/send/device-1";
export const APPLE_ENDPOINT = "https://web.push.apple.com/device-2";

/** Every request to the push relay ends up here. */
export const relayFetch = vi.fn();

const ROUTES = apiRoutes(
  "auth/login.post.ts",
  "shiftplan/index.get.ts",
  "shiftplan/assign.post.ts",
  "shiftplan/unassign.post.ts",
  "instance.get.ts",
  "viewer/login.post.ts",
  "viewer/logout.post.ts",
  "push/devices.post.ts",
  "push/devices.delete.ts",
  "viewer/status.get.ts",
  "push/subscribe.post.ts",
  "push/unsubscribe.post.ts",
  "push/status.get.ts",
  "push/notify.post.ts",
  "team-access/index.get.ts",
  "team-access/index.post.ts"
);

export type PushClient = ApiClient & { push: typeof import("../../server/services/push.service") };

/** The client of the running test, set by openPushClient(). */
export let client: PushClient;

export function stubPushRelay() {
  process.env.SHIFTPLAN_PUSH_RELAY_URL = "https://relay.test";
  vi.stubGlobal("fetch", (...args: unknown[]) => relayFetch(...args));
}

/** Fresh databases with Anna, Max and the „Frühschicht“. */
export async function openPushClient() {
  const api = await createApiClient(ROUTES, (db) => {
    db.prepare("INSERT INTO staff (name, active, is_parttime) VALUES (?, 1, 0)").run("Anna");
    db.prepare("INSERT INTO staff (name, active, is_parttime) VALUES (?, 1, 0)").run("Max");
    db.prepare(
      `
      INSERT INTO shifts (name, active, start_time, end_time, color, min_staff, sort_order)
      VALUES ('Frühschicht', 1, '06:00', '14:00', '#22c55e', 1, 1)
    `
    ).run();
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
