import { describe, expect, it, vi } from "vitest";
import { ANNA, EARLY, FRIDAY, LATE, MAX, THURSDAY, bearer, client, member, sends, useShiftRequestClient } from "./helpers/shift-requests";
import { webPushMock } from "./helpers/web-push-mock";
import { staffOnDay } from "../utils/shift-coverage";

vi.mock("web-push", () => webPushMock);
useShiftRequestClient();

function report(token: string, body: Record<string, unknown>) {
  return client.request<any>("POST", "/api/member/absences", { headers: bearer(token), body: { reason: "privat", ...body } });
}

function week41() {
  return client.request<any[]>("GET", "/api/absences?year=2026&week=41");
}

describe("absences and the plan", () => {
  it("lets staff report absences from today on only", async () => {
    const anna = await member(ANNA, "anna:tok");
    vi.setSystemTime(new Date("2026-10-07T08:00:00Z"));

    const yesterday = await report(anna, { date: "2026-10-06", notifyTeam: false });
    const running = await report(anna, { from: "2026-10-06", to: FRIDAY, notifyTeam: false });
    const today = await report(anna, { date: "2026-10-07", notifyTeam: false });

    expect([yesterday.status, yesterday.json!.statusMessage]).toEqual([400, "Ausfälle lassen sich nur ab heute melden"]);
    expect(running.status).toBe(400);
    expect(today.status).toBe(200);
    expect(client.mainDb.prepare("SELECT absence_date FROM absences").all()).toEqual([{ absence_date: "2026-10-07" }]);
  });

  it("covers the whole day once the person no longer works the shift entered with it", async () => {
    const anna = await member(ANNA, "anna:tok");
    await report(anna, { date: THURSDAY, notifyTeam: false });
    const planner = await client.loginAs("planner", "planner1234");
    for (const [shiftId, present] of [[EARLY, false], [LATE, true]] as const) {
      await client.request("POST", "/api/shiftplan/day-change", {
        jar: planner,
        csrf: true,
        body: { staff_id: ANNA, shift_id: shiftId, date: THURSDAY, present },
      });
    }

    const absences = (await week41()).json!;
    const plan = (await client.request<any>("GET", "/api/shiftplan?year=2026&week=41")).json!;
    const late = plan.shifts.find((shift: any) => shift.shift_id === LATE);

    expect(absences[0]).toMatchObject({ staff_id: ANNA, shift_id: null, shift_name: null });
    expect(staffOnDay(late, THURSDAY, plan.day_changes, absences)).toEqual([MAX]);
  });

  it("ends a running range today and keeps the days before", async () => {
    const anna = await member(ANNA, "anna:tok");
    const range = await report(anna, { from: "2026-10-05", to: FRIDAY, notifyTeam: false });
    vi.setSystemTime(new Date("2026-10-07T08:00:00Z"));

    const ended = await client.request<any>("DELETE", `/api/member/absences/${range.json!.absences[0].absence_id}?range=1`, {
      headers: bearer(anna),
    });
    const left = (await week41()).json!;
    const audit = client.mainDb.prepare("SELECT reason FROM audit_log WHERE action = 'absence_cancel'").all();

    expect(ended.json!.cancelled).toBe(3);
    expect(left.map((absence) => absence.absence_date)).toEqual(["2026-10-05", "2026-10-06"]);
    expect(left[0]).toMatchObject({ range_from: "2026-10-05", range_to: "2026-10-06" });
    expect(audit).toEqual([{ reason: "Mi. 07.10. – Fr. 09.10." }]);
  });

  it("lets staff withdraw only days still ahead, while planners may correct the past", async () => {
    const anna = await member(ANNA, "anna:tok");
    const day = (await report(anna, { date: "2026-10-06", notifyTeam: false })).json!.absences[0].absence_id;
    const range = (await report(anna, { from: THURSDAY, to: FRIDAY, notifyTeam: false })).json!.absences[0].absence_id;
    vi.setSystemTime(new Date("2026-10-10T08:00:00Z"));

    const pastDay = await client.request<any>("DELETE", `/api/member/absences/${day}`, { headers: bearer(anna) });
    const pastRange = await client.request<any>("DELETE", `/api/member/absences/${range}?range=1`, { headers: bearer(anna) });
    const planner = await client.loginAs("planner", "planner1234");
    const corrected = await client.request<any>("DELETE", `/api/absences/${day}`, { jar: planner, csrf: true });

    expect([pastDay.status, pastDay.json!.statusMessage]).toEqual([400, "Vergangene Ausfälle lassen sich nicht zurückziehen"]);
    expect(pastRange.status).toBe(400);
    expect(corrected.json!.cancelled).toBe(1);
    expect((await week41()).json!.map((absence) => absence.absence_date)).toEqual([THURSDAY, FRIDAY]);
  });

  it("asks who takes over only when a takeover request was opened", async () => {
    const anna = await member(ANNA, "anna:tok");
    await member(MAX, "max:tok");

    // KW 42 is not planned yet, so there is no shift to take over.
    await report(anna, { date: "2026-10-13", seekTakeover: true });
    const unplanned = sends().at(-1)!.body;
    await report(anna, { date: THURSDAY, seekTakeover: true });
    const planned = sends().at(-1)!.body;

    expect(unplanned.notification.body).toBe("Anna Weber fällt Di. 13.10. aus");
    expect(unplanned.data.url).toBe("/?year=2026&week=42");
    expect(planned.notification.body).toBe("Anna Weber fällt Do. 08.10. aus – Früh offen – wer übernimmt?");
  });
});
