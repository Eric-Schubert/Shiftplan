import { describe, expect, it, vi } from "vitest";
import { ANNA, EARLY, MAX, THURSDAY, bearer, client, inviteAndRedeem, useMemberAccessClient } from "./helpers/member-access";
import { webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
useMemberAccessClient();

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
