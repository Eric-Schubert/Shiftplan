import { afterEach, beforeEach, expect } from "vitest";
import { createApiClient, type ApiClient, type Route } from "./api-harness";
import { relayCalls, stubRelay } from "./relay-stub";
import { sendNotification } from "./web-push-mock";

const ROUTES: Route[] = [
  ["post", "/api/auth/login", "server/api/auth/login.post"],
  ["get", "/api/shiftplan", "server/api/shiftplan/index.get"],
  ["post", "/api/shiftplan/assign", "server/api/shiftplan/assign.post"],
  ["post", "/api/shiftplan/day-change", "server/api/shiftplan/day-change.post"],
  ["post", "/api/team-access", "server/api/team-access/index.post"],
  ["post", "/api/push/subscribe", "server/api/push/subscribe.post"],
  ["post", "/api/push/devices", "server/api/push/devices.post"],
  ["post", "/api/member/redeem", "server/api/member/redeem.post"],
  ["get", "/api/member/me", "server/api/member/me.get"],
  ["post", "/api/member/logout", "server/api/member/logout.post"],
  ["post", "/api/member/absences", "server/api/member/absences/index.post"],
  ["delete", "/api/member/absences/:id", "server/api/member/absences/[id].delete"],
  ["get", "/api/absences", "server/api/absences/index.get"],
  ["post", "/api/absences", "server/api/absences/index.post"],
  ["delete", "/api/absences/:id", "server/api/absences/[id].delete"],
  ["post", "/api/member-invites", "server/api/member-invites/index.post"],
  ["get", "/api/member-sessions", "server/api/member-sessions/index.get"],
  ["delete", "/api/member-sessions/:id", "server/api/member-sessions/[id].delete"],
];

export const ANNA = 1;
export const MAX = 2;
export const EARLY = 1;
// KW 41/2026: Monday 05.10. to Sunday 11.10.
export const THURSDAY = "2026-10-08";
export const FCM_ENDPOINT = "https://fcm.googleapis.com/fcm/send/web-1";

/** The client of the running test. */
export let client: ApiClient;

export function bearer(token: string) {
  return { authorization: `Bearer ${token}` };
}

export async function inviteAndRedeem(staffId: number, deviceName = "iPhone von Anna") {
  const planner = await client.loginAs("planner", "planner1234");
  const invite = await client.request<{ code: string; path: string }>("POST", "/api/member-invites", {
    jar: planner,
    csrf: true,
    body: { staffId },
  });
  expect(invite.status).toBe(200);
  const redeem = await client.request<{ token: string; staff: { id: number; name: string } }>(
    "POST",
    "/api/member/redeem",
    { body: { code: invite.json!.code, deviceName } }
  );
  expect(redeem.status).toBe(200);
  return { code: invite.json!.code, path: invite.json!.path, token: redeem.json!.token, staff: redeem.json!.staff };
}

/**
 * Fresh databases for every test: Anna works the Frühschicht in KW 41, Max is free,
 * a third person is inactive. Pushes go to the web-push mock and a fake relay.
 */
export function useMemberAccessClient() {
  stubRelay();

  beforeEach(async () => {
    sendNotification.mockReset();
    sendNotification.mockResolvedValue({ statusCode: 201 });
    relayCalls.length = 0;
    client = await createApiClient(ROUTES, (db) => {
      db.prepare("INSERT INTO staff (name, active, is_parttime) VALUES ('Anna Weber', 1, 0)").run();
      db.prepare("INSERT INTO staff (name, active, is_parttime) VALUES ('Max Mustermann', 1, 0)").run();
      db.prepare("INSERT INTO staff (name, active, is_parttime) VALUES ('Ehemalige', 0, 0)").run();
      db.prepare(
        "INSERT INTO shifts (name, active, start_time, end_time, color, min_staff, sort_order) VALUES ('Frühschicht', 1, '06:00', '14:00', '#22c55e', 1, 1)"
      ).run();
      db.prepare(
        "INSERT INTO shifts (name, active, start_time, end_time, color, min_staff, sort_order) VALUES ('Spätschicht', 1, '14:00', '22:00', '#3b82f6', 1, 2)"
      ).run();
      db.prepare("INSERT INTO weeks (year, week_number) VALUES (2026, 41)").run();
      db.prepare("INSERT INTO shift_assignments (staff_id, shift_id, week_id) VALUES (?, ?, 1)").run(ANNA, EARLY);
    });
  });

  afterEach(() => {
    client.close();
  });
}
