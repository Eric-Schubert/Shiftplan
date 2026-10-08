import { afterEach, beforeEach, vi } from "vitest";
import { createApiClient, type ApiClient, type Route } from "./api-harness";
import { relayCalls, stubRelay } from "./relay-stub";
import { sendNotification } from "./web-push-mock";

const ROUTES: Route[] = [
  ["post", "/api/auth/login", "server/api/auth/login.post"],
  ["get", "/api/shiftplan", "server/api/shiftplan/index.get"],
  ["post", "/api/push/devices", "server/api/push/devices.post"],
  ["post", "/api/member/redeem", "server/api/member/redeem.post"],
  ["post", "/api/member/absences", "server/api/member/absences/index.post"],
  ["delete", "/api/member/absences/:id", "server/api/member/absences/[id].delete"],
  ["get", "/api/member/requests", "server/api/member/requests/index.get"],
  ["post", "/api/member/requests", "server/api/member/requests/index.post"],
  ["post", "/api/member/requests/:id", "server/api/member/requests/[id].post"],
  ["get", "/api/requests", "server/api/requests/index.get"],
  ["post", "/api/requests/settings", "server/api/requests/settings.put"],
  ["post", "/api/requests/:id", "server/api/requests/[id].post"],
  ["post", "/api/member-invites", "server/api/member-invites/index.post"],
];

export const ANNA = 1;
export const MAX = 2;
export const EARLY = 1;
export const LATE = 2;
// KW 41/2026: Monday 05.10. to Sunday 11.10. The clock is set to Monday.
export const THURSDAY = "2026-10-08";
export const FRIDAY = "2026-10-09";

/** The client of the running test. */
export let client: ApiClient;

export function bearer(token: string) {
  return { authorization: `Bearer ${token}` };
}

export async function member(staffId: number, pushToken: string) {
  const planner = await client.loginAs("planner", "planner1234");
  const invite = await client.request<{ code: string }>("POST", "/api/member-invites", {
    jar: planner,
    csrf: true,
    body: { staffId },
  });
  const redeem = await client.request<{ token: string }>("POST", "/api/member/redeem", {
    body: { code: invite.json!.code, deviceName: "Test" },
  });
  const token = redeem.json!.token;
  await client.request("POST", "/api/push/devices", { headers: bearer(token), body: { platform: "ios", token: pushToken } });
  return token;
}

/** Who works the shift on that day according to the plan API (weekly plan plus day changes). */
export async function staffOn(shiftId: number, date: string): Promise<number[]> {
  const plan = await client.request<any>("GET", "/api/shiftplan?year=2026&week=41");
  const shift = plan.json!.shifts.find((entry: any) => entry.shift_id === shiftId);
  const ids = new Set<number>(shift.assigned_staff.map((staff: any) => staff.staff_id));
  for (const change of plan.json!.day_changes) {
    if (change.shift_id !== shiftId || change.change_date !== date) continue;
    if (change.kind === "add") ids.add(change.staff_id);
    else ids.delete(change.staff_id);
  }
  return [...ids].sort();
}

export function sends() {
  return relayCalls.filter((call) => call.url.endsWith("/v1/send"));
}

/** Fresh databases for every test: Anna works Früh, Max works Spät in KW 41. */
export function useShiftRequestClient() {
  stubRelay();
  sendNotification.mockResolvedValue({ statusCode: 201 });

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-05T08:00:00Z") });
    relayCalls.length = 0;
    client = await createApiClient(ROUTES, (db) => {
      db.prepare("INSERT INTO staff (name, active, is_parttime) VALUES ('Anna Weber', 1, 0)").run();
      db.prepare("INSERT INTO staff (name, active, is_parttime) VALUES ('Max Mustermann', 1, 0)").run();
      db.prepare(
        "INSERT INTO shifts (name, active, start_time, end_time, color, min_staff, sort_order) VALUES ('Früh', 1, '06:00', '14:00', '#22c55e', 1, 1)"
      ).run();
      db.prepare(
        "INSERT INTO shifts (name, active, start_time, end_time, color, min_staff, sort_order) VALUES ('Spät', 1, '14:00', '22:00', '#3b82f6', 1, 2)"
      ).run();
      db.prepare("INSERT INTO weeks (year, week_number) VALUES (2026, 41)").run();
      db.prepare("INSERT INTO shift_assignments (staff_id, shift_id, week_id) VALUES (?, ?, 1)").run(ANNA, EARLY);
      db.prepare("INSERT INTO shift_assignments (staff_id, shift_id, week_id) VALUES (?, ?, 1)").run(MAX, LATE);
    });
  });

  afterEach(() => {
    client.close();
    vi.useRealTimers();
  });
}
