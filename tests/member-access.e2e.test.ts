import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient, type ApiClient, type Route } from "./helpers/api-harness";

const sendNotification = vi.fn();
vi.mock("web-push", () => ({
  default: {
    generateVAPIDKeys: () => ({ publicKey: "test-public-key", privateKey: "test-private-key" }),
    sendNotification: (...args: unknown[]) => sendNotification(...args),
  },
}));

const relayCalls: Array<{ url: string; body: any }> = [];
process.env.SHIFTPLAN_PUSH_RELAY_URL = "https://relay.test";
vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
  const body = JSON.parse(String(init.body));
  relayCalls.push({ url, body });
  const payload = url.endsWith("/v1/instances")
    ? { instanceId: "inst_test", secret: "sk_test" }
    : { sent: body.tokens.length, failed: 0, invalidTokens: [] };
  return new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } });
});

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

const ANNA = 1;
const MAX = 2;
const EARLY = 1;
// KW 41/2026: Monday 05.10. to Sunday 11.10.
const THURSDAY = "2026-10-08";
const FCM_ENDPOINT = "https://fcm.googleapis.com/fcm/send/web-1";
const KEYS = { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQ", auth: "tBHItJI5svbpez7KI4CCXg" };

let client: ApiClient;

function bearer(token: string) {
  return { authorization: `Bearer ${token}` };
}

async function inviteAndRedeem(staffId: number, deviceName = "iPhone von Anna") {
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

describe("personal app access", () => {
  it("redeems a personal QR code once and identifies the staff member", async () => {
    const { code, path, token, staff } = await inviteAndRedeem(ANNA);

    const me = await client.request("GET", "/api/member/me", { headers: bearer(token) });
    const again = await client.request("POST", "/api/member/redeem", { body: { code } });
    const formatted = await client.request("POST", "/api/member/redeem", {
      body: { code: `${code.slice(0, 5).toLowerCase()}-${code.slice(5)}` },
    });

    expect(code).toMatch(/^[A-Z2-9]{10}$/);
    expect(path).toBe(`/?einladung=${code}`);
    expect(staff).toEqual({ id: ANNA, name: "Anna Weber" });
    expect(me.json).toEqual({ staff: { id: ANNA, name: "Anna Weber" } });
    expect(again.status).toBe(401);
    expect(formatted.status).toBe(401);
    expect(client.adminDb.prepare("SELECT token_hash FROM member_sessions").get()).not.toEqual({ token_hash: token });
  });

  it("accepts codes typed with spaces or dashes and rejects expired ones", async () => {
    const planner = await client.loginAs("planner", "planner1234");
    const create = async () =>
      (await client.request<{ code: string }>("POST", "/api/member-invites", { jar: planner, csrf: true, body: { staffId: MAX } }))
        .json!.code;

    const typed = await create();
    const ok = await client.request("POST", "/api/member/redeem", {
      body: { code: `${typed.slice(0, 5).toLowerCase()} ${typed.slice(5)}` },
    });
    const expired = await create();
    client.adminDb.prepare("UPDATE member_invites SET expires_at = 1 WHERE used_at IS NULL").run();
    const late = await client.request("POST", "/api/member/redeem", { body: { code: expired } });
    const inactive = await client.request("POST", "/api/member-invites", { jar: planner, csrf: true, body: { staffId: 3 } });

    expect(ok.status).toBe(200);
    expect(late.status).toBe(401);
    expect(inactive.status).toBe(404);
  });

  it("lets everyone use the demo code again and again, but only where it is configured", async () => {
    const redeem = (code: string) =>
      client.request<{ staff: { id: number; name: string } }>("POST", "/api/member/redeem", {
        body: { code, deviceName: "Review" },
      });

    const disabled = await redeem("DEMO");
    process.env.SHIFTPLAN_DEMO_MEMBER_CODE = "demo";
    process.env.SHIFTPLAN_DEMO_MEMBER_NAME = "Max Mustermann";
    try {
      const first = await redeem("DEMO");
      const second = await redeem(" de-mo ");
      const wrong = await redeem("DEMO2");

      expect(first.status).toBe(200);
      expect(first.json!.staff).toEqual({ id: MAX, name: "Max Mustermann" });
      expect(second.status).toBe(200);
      expect(wrong.status).toBe(401);
    } finally {
      delete process.env.SHIFTPLAN_DEMO_MEMBER_CODE;
      delete process.env.SHIFTPLAN_DEMO_MEMBER_NAME;
    }
    expect(disabled.status).toBe(401);
  });

  it("gives read access behind the team code but no planner rights", async () => {
    const { token } = await inviteAndRedeem(ANNA);
    const admin = await client.loginAs("admin", "admin1234");
    await client.request("POST", "/api/team-access", { jar: admin, csrf: true, body: { generate: true } });

    const anonymous = await client.request("GET", "/api/shiftplan?year=2026&week=41");
    const member = await client.request("GET", "/api/shiftplan?year=2026&week=41", { headers: bearer(token) });
    const plannerOnly = await client.request("POST", "/api/absences", {
      headers: bearer(token),
      body: { staffId: MAX, date: THURSDAY, reason: "krank" },
    });
    const invite = await client.request("POST", "/api/member-invites", { headers: bearer(token), body: { staffId: MAX } });
    const assign = await client.request("POST", "/api/shiftplan/assign", {
      headers: bearer(token),
      body: { staff_id: MAX, shift_id: EARLY, year: 2026, week: 41 },
    });

    expect(anonymous.status).toBe(401);
    expect(member.status).toBe(200);
    expect(plannerOnly.status).toBe(401);
    expect(invite.status).toBe(401);
    expect(assign.status).toBe(401);
  });

  it("binds push devices to the person behind the token", async () => {
    const { token } = await inviteAndRedeem(ANNA);

    await client.request("POST", "/api/push/devices", {
      headers: bearer(token),
      body: { platform: "ios", token: "anna-phone:APA91b", staffId: MAX, scope: "mine" },
    });

    expect(client.adminDb.prepare("SELECT staff_id, scope, member_session FROM push_devices").get()).toMatchObject({
      staff_id: ANNA,
      scope: "mine",
      member_session: expect.any(String),
    });
  });

  it("lets planners list and revoke devices, which also removes their push registration", async () => {
    const { token } = await inviteAndRedeem(ANNA);
    await client.request("POST", "/api/push/devices", {
      headers: bearer(token),
      body: { platform: "android", token: "anna-phone:APA91b" },
    });
    const planner = await client.loginAs("planner", "planner1234");

    const list = await client.request<Array<{ sessionId: string; staffName: string; deviceName: string }>>(
      "GET",
      "/api/member-sessions",
      { jar: planner }
    );
    const revoke = await client.request("DELETE", `/api/member-sessions/${list.json![0]!.sessionId}`, {
      jar: planner,
      csrf: true,
    });
    const after = await client.request("GET", "/api/member/me", { headers: bearer(token) });

    expect(list.json).toEqual([expect.objectContaining({ staffName: "Anna Weber", deviceName: "iPhone von Anna" })]);
    expect(revoke.status).toBe(200);
    expect(after.status).toBe(401);
    expect(client.adminDb.prepare("SELECT COUNT(*) AS count FROM push_devices").get()).toEqual({ count: 0 });
  });

  it("signs a device out on its own", async () => {
    const { token } = await inviteAndRedeem(ANNA);
    await client.request("POST", "/api/member/logout", { headers: bearer(token) });
    expect((await client.request("GET", "/api/member/me", { headers: bearer(token) })).status).toBe(401);
  });
});

describe("absences", () => {
  it("lets staff report their own absence and tells the team without the reason", async () => {
    const anna = await inviteAndRedeem(ANNA);
    const max = await inviteAndRedeem(MAX, "Pixel von Max");
    await client.request("POST", "/api/push/devices", { headers: bearer(anna.token), body: { platform: "ios", token: "anna:APA91b" } });
    await client.request("POST", "/api/push/devices", { headers: bearer(max.token), body: { platform: "android", token: "max:APA91b" } });
    await client.request("POST", "/api/push/subscribe", { body: { endpoint: FCM_ENDPOINT, keys: KEYS } });

    const report = await client.request<{ absence: any; notified: { sent: number } }>("POST", "/api/member/absences", {
      headers: bearer(anna.token),
      body: { date: THURSDAY, reason: "urlaub", message: "Bin ab Freitag wieder da" },
    });
    const send = relayCalls.find((call) => call.url.endsWith("/v1/send"))!;
    const webPush = JSON.parse(sendNotification.mock.calls[0]![1]);

    expect(report.status).toBe(200);
    expect(report.json!.absence).toMatchObject({ staff_name: "Anna Weber", shift_name: "Frühschicht", source: "app" });
    expect(report.json!.notified).toEqual({ sent: 2, failed: 0 });
    expect(send.body.tokens).toEqual(["max:APA91b"]);
    expect(send.body.notification).toEqual({
      title: "Ausfall im Team",
      body: "Anna Weber fällt Do. 08.10. aus – Frühschicht offen\nBin ab Freitag wieder da",
    });
    expect(send.body.data).toMatchObject({ url: "/?year=2026&week=41", year: "2026", week: "41" });
    expect(webPush.body).toContain("Anna Weber fällt Do. 08.10. aus");
    expect(JSON.stringify([send, webPush])).not.toContain("urlaub");
  });

  it("accepts unplanned days and skips days that already have an absence", async () => {
    const anna = await inviteAndRedeem(ANNA);
    const max = await inviteAndRedeem(MAX);
    const report = (token: string, from: string, to?: string) =>
      client.request<{ absences: any[]; skipped: string[] }>("POST", "/api/member/absences", {
        headers: bearer(token),
        body: { from, to, reason: "privat", notifyTeam: false },
      });

    const unassigned = await report(max.token, THURSDAY);
    const first = await report(anna.token, THURSDAY);
    const duplicate = await report(anna.token, THURSDAY);
    const overlapping = await report(anna.token, "2026-10-07", "2026-10-09");
    const invalidDate = await report(anna.token, "2026-02-30");
    const backwards = await report(anna.token, "2026-10-09", "2026-10-07");
    const tooLong = await report(anna.token, "2026-10-01", "2026-12-31");

    expect(unassigned.status).toBe(200);
    expect(unassigned.json!.absences[0]).toMatchObject({ shift_id: null, batch_id: null });
    expect(first.status).toBe(200);
    expect(duplicate.status).toBe(409);
    expect(overlapping.status).toBe(200);
    expect(overlapping.json!.absences.map((absence) => absence.absence_date)).toEqual(["2026-10-07", "2026-10-09"]);
    expect(overlapping.json!.skipped).toEqual([THURSDAY]);
    expect(invalidDate.status).toBe(400);
    expect(backwards.status).toBe(400);
    expect(tooLong.status).toBe(400);
  });

  it("enters a range across weeks with one push and withdraws it as a whole", async () => {
    const anna = await inviteAndRedeem(ANNA);
    const max = await inviteAndRedeem(MAX, "Pixel von Max");
    await client.request("POST", "/api/push/devices", { headers: bearer(max.token), body: { platform: "android", token: "max:APA91b" } });

    const report = await client.request<{ absences: any[] }>("POST", "/api/member/absences", {
      headers: bearer(anna.token),
      body: { from: "2026-10-08", to: "2026-10-14", reason: "urlaub" },
    });
    const sends = relayCalls.filter((call) => call.url.endsWith("/v1/send"));
    const week41 = await client.request<any[]>("GET", "/api/absences?year=2026&week=41", { headers: bearer(anna.token) });
    const week42 = await client.request<any[]>("GET", "/api/absences?year=2026&week=42", { headers: bearer(anna.token) });

    expect(report.status).toBe(200);
    expect(report.json!.absences).toHaveLength(7);
    // Only KW 41 is planned: those days carry the shift, the rest stays without one.
    expect(report.json!.absences.map((absence) => absence.shift_id)).toEqual([EARLY, EARLY, EARLY, EARLY, null, null, null]);
    expect(new Set(report.json!.absences.map((absence) => absence.batch_id)).size).toBe(1);
    expect(sends).toHaveLength(1);
    expect(sends[0]!.body.notification.body).toBe("Anna Weber fällt Do. 08.10. – Mi. 14.10. aus");
    expect(week41.json).toHaveLength(4);
    expect(week42.json![0]).toMatchObject({ range_from: "2026-10-08", range_to: "2026-10-14" });

    const single = await client.request("DELETE", `/api/member/absences/${report.json!.absences[0].absence_id}`, {
      headers: bearer(anna.token),
    });
    const afterSingle = await client.request<any[]>("GET", "/api/absences?year=2026&week=42");
    const whole = await client.request<{ cancelled: number }>(
      "DELETE",
      `/api/member/absences/${report.json!.absences[6].absence_id}?range=1`,
      { headers: bearer(anna.token) }
    );
    const remaining = client.mainDb.prepare("SELECT COUNT(*) AS count FROM absences WHERE cancelled_at IS NULL").get() as {
      count: number;
    };
    const audit = client.mainDb.prepare("SELECT action, week_number, reason FROM audit_log ORDER BY audit_id").all();

    expect(single.status).toBe(200);
    expect(afterSingle.json![0]).toMatchObject({ range_from: "2026-10-09", range_to: "2026-10-14" });
    expect(whole.json!.cancelled).toBe(6);
    expect(remaining.count).toBe(0);
    expect(audit).toEqual([
      { action: "absence", week_number: 41, reason: "Do. 08.10. – So. 11.10." },
      { action: "absence", week_number: 42, reason: "Mo. 12.10. – Mi. 14.10." },
      { action: "absence_cancel", week_number: 41, reason: "Do. 08.10." },
      { action: "absence_cancel", week_number: 41, reason: "Fr. 09.10. – So. 11.10." },
      { action: "absence_cancel", week_number: 42, reason: "Mo. 12.10. – Mi. 14.10." },
    ]);
  });

  it("hides reasons from everyone but planners", async () => {
    const anna = await inviteAndRedeem(ANNA);
    await client.request("POST", "/api/member/absences", {
      headers: bearer(anna.token),
      body: { date: THURSDAY, reason: "urlaub", notifyTeam: false },
    });
    const planner = await client.loginAs("planner", "planner1234");

    const anonymous = await client.request<any[]>("GET", "/api/absences?year=2026&week=41");
    const member = await client.request<any[]>("GET", "/api/absences?year=2026&week=41", { headers: bearer(anna.token) });
    const asPlanner = await client.request<any[]>("GET", "/api/absences?year=2026&week=41", { jar: planner });

    expect(anonymous.json).toEqual([expect.objectContaining({ staff_name: "Anna Weber", absence_date: THURSDAY })]);
    expect(anonymous.json![0]).not.toHaveProperty("reason");
    expect(member.json![0]).not.toHaveProperty("reason");
    expect(asPlanner.json![0]).toMatchObject({ reason: "urlaub" });
  });

  it("lets staff withdraw only their own absence and logs everything with its source", async () => {
    const anna = await inviteAndRedeem(ANNA);
    const max = await inviteAndRedeem(MAX);
    const report = await client.request<{ absence: { absence_id: number } }>("POST", "/api/member/absences", {
      headers: bearer(anna.token),
      body: { date: THURSDAY, reason: "sonstiges", notifyTeam: false },
    });
    const id = report.json!.absence.absence_id;

    const foreign = await client.request("DELETE", `/api/member/absences/${id}`, { headers: bearer(max.token) });
    const own = await client.request("DELETE", `/api/member/absences/${id}`, { headers: bearer(anna.token) });
    const audit = client.mainDb
      .prepare("SELECT username, action, source, shift_name, staff_name, reason FROM audit_log ORDER BY audit_id")
      .all();

    expect(foreign.status).toBe(404);
    expect(own.status).toBe(200);
    expect(audit).toEqual([
      { username: "Anna Weber", action: "absence", source: "app", shift_name: "Frühschicht", staff_name: "Anna Weber", reason: "Do. 08.10." },
      { username: "Anna Weber", action: "absence_cancel", source: "app", shift_name: "Frühschicht", staff_name: "Anna Weber", reason: "Do. 08.10." },
    ]);
  });

  it("lets planners manage absences for anyone", async () => {
    const planner = await client.loginAs("planner", "planner1234");
    const create = await client.request<{ absence: { absence_id: number; shift_id: number | null } }>("POST", "/api/absences", {
      jar: planner,
      csrf: true,
      body: { staffId: MAX, date: THURSDAY, reason: "privat", note: "Umzug" },
    });
    const remove = await client.request("DELETE", `/api/absences/${create.json!.absence.absence_id}`, {
      jar: planner,
      csrf: true,
    });

    expect(create.status).toBe(200);
    expect(create.json!.absence.shift_id).toBeNull();
    expect(remove.status).toBe(200);
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("forgets reasons and notes after 90 days but keeps the absence", async () => {
    client.mainDb
      .prepare(
        "INSERT INTO absences (staff_id, absence_date, reason, note, source, created_by) VALUES (?, date('now', '-100 days'), 'privat', 'Umzug', 'web', 'planner')"
      )
      .run(ANNA);
    const date = client.mainDb.prepare("SELECT absence_date FROM absences").get() as { absence_date: string };
    const { AbsenceService } = await import("../server/services/absence.service");
    const { toISOWeek } = await import("../server/utils/iso-week");
    const [year, month, day] = date.absence_date.split("-").map(Number) as [number, number, number];
    const week = toISOWeek(year, month, day);

    const rows = AbsenceService.listForWeek(week.year, week.week, true);

    expect(rows).toEqual([expect.objectContaining({ staff_name: "Anna Weber", reason: null, note: null })]);
  });
});

describe("day changes", () => {
  it("puts people into or out of a shift for single days on top of the weekly plan", async () => {
    const planner = await client.loginAs("planner", "planner1234");
    const change = (staff_id: number, date: string, present: boolean) =>
      client.request<{ changed: boolean }>("POST", "/api/shiftplan/day-change", {
        jar: planner,
        csrf: true,
        body: { staff_id, shift_id: EARLY, date, present },
      });

    const removeAnna = await change(ANNA, THURSDAY, false);
    const removeAgain = await change(ANNA, THURSDAY, false);
    const addMax = await change(MAX, THURSDAY, true);
    const addMaxFriday = await change(MAX, "2026-10-09", true);
    const backToPlan = await change(MAX, "2026-10-09", false);
    const plan = await client.request<any>("GET", "/api/shiftplan?year=2026&week=41");
    const audit = client.mainDb.prepare("SELECT action, staff_name, reason FROM audit_log ORDER BY audit_id").all();

    expect(removeAnna.json!.changed).toBe(true);
    expect(removeAgain.json!.changed).toBe(false);
    expect(addMax.json!.changed).toBe(true);
    expect(addMaxFriday.json!.changed).toBe(true);
    expect(backToPlan.json!.changed).toBe(true);
    expect(plan.json!.day_changes.map((entry: any) => [entry.staff_name, entry.change_date, entry.kind])).toEqual([
      ["Anna Weber", THURSDAY, "remove"],
      ["Max Mustermann", THURSDAY, "add"],
    ]);
    expect(audit).toEqual([
      { action: "day_remove", staff_name: "Anna Weber", reason: "nur Do. 08.10." },
      { action: "day_add", staff_name: "Max Mustermann", reason: "nur Do. 08.10." },
      { action: "day_add", staff_name: "Max Mustermann", reason: "nur Fr. 09.10." },
      { action: "day_remove", staff_name: "Max Mustermann", reason: "nur Fr. 09.10." },
    ]);
  });

  it("takes the shift of a day change for an absence on that day", async () => {
    const planner = await client.loginAs("planner", "planner1234");
    await client.request("POST", "/api/shiftplan/day-change", {
      jar: planner,
      csrf: true,
      body: { staff_id: MAX, shift_id: EARLY, date: THURSDAY, present: true },
    });
    const max = await inviteAndRedeem(MAX);

    const report = await client.request<{ absence: { shift_name: string } }>("POST", "/api/member/absences", {
      headers: bearer(max.token),
      body: { date: THURSDAY, reason: "privat", notifyTeam: false },
    });

    expect(report.json!.absence.shift_name).toBe("Frühschicht");
  });
});

describe("planner sessions in the app", () => {
  it("returns a Bearer token without cookies and needs no CSRF token with it", async () => {
    const login = await client.request<{ token: string; expiresAt: number }>("POST", "/api/auth/login", {
      body: { username: "planner", password: "planner1234", client: "app" },
    });
    const assign = await client.request("POST", "/api/shiftplan/assign", {
      headers: bearer(login.json!.token),
      body: { staff_id: MAX, shift_id: EARLY, year: 2030, week: 10 },
    });
    const audit = client.mainDb.prepare("SELECT username, source FROM audit_log").get();

    expect(login.headers.some(([name]) => name.toLowerCase() === "set-cookie")).toBe(false);
    expect(login.json!.expiresAt - Date.now()).toBeGreaterThan(13 * 24 * 60 * 60 * 1000);
    expect(assign.status).toBe(200);
    expect(audit).toEqual({ username: "planner", source: "app" });
  });

  it("still requires CSRF for cookie sessions", async () => {
    const planner = await client.loginAs("planner", "planner1234");
    const withoutCsrf = await client.request("POST", "/api/shiftplan/assign", {
      jar: planner,
      body: { staff_id: MAX, shift_id: EARLY, year: 2030, week: 10 },
    });
    expect(withoutCsrf.status).toBe(403);
  });
});
