import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ANNA,
  FCM_ENDPOINT,
  MAX,
  THURSDAY,
  bearer,
  client,
  inviteAndRedeem,
  useMemberAccessClient,
} from "./helpers/member-access";
import { relayCalls } from "./helpers/relay-stub";
import { KEYS, sendNotification, webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
// KW 41 is over by now, and staff report absences from today on: the clock stands on its Monday.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-05T08:00:00Z") });
});
afterEach(() => {
  vi.useRealTimers();
});
useMemberAccessClient();

describe("absences", () => {
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

  it("lets planners manage absences for anyone and pushes only when asked", async () => {
    const anna = await inviteAndRedeem(ANNA);
    await client.request("POST", "/api/push/devices", { headers: bearer(anna.token), body: { platform: "ios", token: "anna:APA91b" } });
    await client.request("POST", "/api/push/subscribe", { body: { endpoint: FCM_ENDPOINT, keys: KEYS } });
    const appSends = () => relayCalls.filter((call) => call.url.endsWith("/v1/send")).length;
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
    const silent = { browsers: sendNotification.mock.calls.length, apps: appSends() };
    await client.request("POST", "/api/absences", {
      jar: planner,
      csrf: true,
      body: { staffId: MAX, date: "2026-10-09", reason: "privat", notifyTeam: true },
    });

    expect(create.status).toBe(200);
    expect(create.json!.absence.shift_id).toBeNull();
    expect(remove.status).toBe(200);
    expect(silent).toEqual({ browsers: 0, apps: 0 });
    // The same browser and app do get the push once the planner asks for it.
    expect({ browsers: sendNotification.mock.calls.length, apps: appSends() }).toEqual({ browsers: 1, apps: 1 });
  });

  it("allows ranges longer than 8 weeks only for admins", async () => {
    const body = { staffId: MAX, from: "2026-10-12", to: "2026-12-31", reason: "sonstiges" };
    const planner = await client.loginAs("planner", "planner1234");
    const admin = await client.loginAs("admin", "admin1234");

    const asPlanner = await client.request("POST", "/api/absences", { jar: planner, csrf: true, body });
    const asAdmin = await client.request<{ absences: unknown[] }>("POST", "/api/absences", { jar: admin, csrf: true, body });
    const tooLong = await client.request("POST", "/api/absences", {
      jar: admin,
      csrf: true,
      body: { ...body, staffId: ANNA, to: "2027-10-13" },
    });

    expect(asPlanner.status).toBe(400);
    expect(asAdmin.status).toBe(200);
    expect(asAdmin.json!.absences).toHaveLength(81);
    expect(tooLong.status).toBe(400);
  });

  it("forgets reasons and notes after 90 days but keeps the absence", async () => {
    vi.useRealTimers(); // Purging compares with SQLite's own clock.
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

  it("deletes removed absences 90 days after the day", async () => {
    vi.useRealTimers(); // Purging compares with SQLite's own clock.
    const insert = client.mainDb.prepare(
      "INSERT INTO absences (staff_id, absence_date, reason, source, created_by, cancelled_at) VALUES (?, date('now', ?), 'privat', 'web', 'planner', ?)"
    );
    insert.run(ANNA, "-100 days", "2026-01-01 08:00:00");
    insert.run(ANNA, "-100 days", null);
    insert.run(ANNA, "-10 days", "2026-01-01 08:00:00");
    const { AbsenceService } = await import("../server/services/absence.service");

    AbsenceService.listForWeek(2026, 41, true);

    const rows = client.mainDb.prepare("SELECT cancelled_at IS NOT NULL AS removed FROM absences ORDER BY absence_date").all();
    expect(rows).toEqual([{ removed: 0 }, { removed: 1 }]);
  });
});
