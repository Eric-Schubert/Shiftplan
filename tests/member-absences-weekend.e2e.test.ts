import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ANNA, allowWeekends, bearer, client, inviteAndRedeem, useMemberAccessClient } from "./helpers/member-access";

// Week 41 is over by now, and staff report absences from today on: the clock stands on its Monday.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-05T08:00:00Z") });
});
afterEach(() => {
  vi.useRealTimers();
});
useMemberAccessClient();

describe("absences on weekends", () => {
  it("leaves out weekends for teams that do not work them", async () => {
    const anna = await inviteAndRedeem(ANNA);
    const report = (from: string, to?: string) =>
      client.request<{ absences: any[] }>("POST", "/api/member/absences", {
        headers: bearer(anna.token),
        body: { from, to, reason: "privat", notifyTeam: false },
      });

    const range = await report("2026-10-09", "2026-10-12");
    const saturday = await report("2026-10-10");
    const weekend = await report("2026-10-17", "2026-10-18");

    expect(range.status).toBe(200);
    expect(range.json!.absences.map((absence) => absence.absence_date)).toEqual(["2026-10-09", "2026-10-12"]);
    expect(saturday.status).toBe(400);
    expect(weekend.status).toBe(400);

    await allowWeekends();
    expect((await report("2026-10-10")).status).toBe(200);
  });

});
