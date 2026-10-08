import { afterEach, beforeEach, expect } from "vitest";
import { createApiClient, type ApiClient, type CookieJar, type Route } from "./api-harness";
import { sendNotification } from "./web-push-mock";

const ROUTES: Route[] = [
  ["post", "/api/auth/login", "server/api/auth/login.post"],
  ["post", "/api/staff", "server/api/staff/index.post"],
  ["patch", "/api/staff/:id", "server/api/staff/[id].patch"],
  ["delete", "/api/staff/:id/pin", "server/api/staff/[id]/pin.delete"],
  ["post", "/api/push/subscribe", "server/api/push/subscribe.post"],
  ["post", "/api/member/redeem", "server/api/member/redeem.post"],
  ["post", "/api/member/login", "server/api/member/login.post"],
  ["put", "/api/member/pin", "server/api/member/pin.put"],
  ["get", "/api/member/me", "server/api/member/me.get"],
  ["post", "/api/member/logout", "server/api/member/logout.post"],
  ["post", "/api/member/absences", "server/api/member/absences/index.post"],
  ["post", "/api/member-invites", "server/api/member-invites/index.post"],
  ["get", "/api/member-sessions/pins", "server/api/member-sessions/pins.get"],
  ["get", "/api/viewer/status", "server/api/viewer/status.get"],
];

export const ANNA = 1;
export const MAX = 2;
export const SAME_ORIGIN = { origin: "http://localhost", host: "localhost" };

/** The client of the running test. */
export let client: ApiClient;

/** A browser that redeems the planner's QR code for a person. */
export async function browserWithInvite(staffId: number): Promise<CookieJar> {
  const planner = await client.loginAs("planner", "planner1234");
  const invite = await client.request<{ code: string }>("POST", "/api/member-invites", {
    jar: planner,
    csrf: true,
    body: { staffId },
  });
  const jar: CookieJar = new Map();
  const redeem = await client.request("POST", "/api/member/redeem", {
    jar,
    headers: SAME_ORIGIN,
    body: { code: invite.json!.code, client: "web", deviceName: "Firefox" },
  });
  expect(redeem.status).toBe(200);
  return jar;
}

export function pinLogin(shortCode: string, pin: string, extra: Record<string, unknown> = {}, jar?: CookieJar) {
  return client.request<any>("POST", "/api/member/login", {
    jar,
    headers: SAME_ORIGIN,
    body: { shortCode, pin, ...extra },
  });
}

/** Fresh databases for every test with Anna (AW) and Max (MM); app pushes are off. */
export function useMemberPinClient() {
  process.env.SHIFTPLAN_PUSH_RELAY_URL = "off";

  beforeEach(async () => {
    sendNotification.mockReset();
    sendNotification.mockResolvedValue({ statusCode: 201 });
    client = await createApiClient(ROUTES, (db) => {
      db.prepare("INSERT INTO staff (name, short_code) VALUES ('Anna Weber', 'AW')").run();
      db.prepare("INSERT INTO staff (name, short_code) VALUES ('Max Mustermann', 'MM')").run();
      db.prepare(
        "INSERT INTO shifts (name, active, start_time, end_time, color, min_staff, sort_order) VALUES ('Frühschicht', 1, '06:00', '14:00', '#22c55e', 1, 1)"
      ).run();
    });
  });

  afterEach(() => {
    client.close();
  });
}
