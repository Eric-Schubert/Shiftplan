import { describe, expect, it, vi } from "vitest";
import { ANNA, EARLY, FRIDAY, LATE, MAX, THURSDAY, act, bearer, client, member, staffOn, useShiftRequestClient } from "./helpers/shift-requests";
import { webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
useShiftRequestClient();

function create(token: string, body: Record<string, unknown>) {
  return client.request<any>("POST", "/api/member/requests", { headers: bearer(token), body });
}

describe("dates of requests", () => {
  it("counts days in the planning time zone, not in UTC", async () => {
    const anna = await member(ANNA, "anna:tok");
    const max = await member(MAX, "max:tok");
    const created = await client.request<any>("POST", "/api/member/requests", {
      headers: bearer(anna),
      body: { kind: "takeover", date: THURSDAY },
    });
    const id = created.json!.request.request_id;
    await act(max, id, "accept");
    await act(max, id, "request_undo");

    // 22:30 UTC on Wednesday is already 00:30 on Thursday in Berlin.
    vi.setSystemTime(new Date("2026-10-07T22:30:00Z"));
    const sameDay = await act(anna, id, "confirm_undo");
    const wednesday = await client.request<any>("POST", "/api/member/requests", {
      headers: bearer(anna),
      body: { kind: "takeover", date: "2026-10-07" },
    });

    expect(sameDay.status).toBe(409);
    expect(sameDay.json!.statusMessage).toBe("Stornieren geht nur bis zum Vortag");
    expect(wednesday.status).toBe(400);
    expect(wednesday.json!.statusMessage).toBe("Der Tag liegt in der Vergangenheit");
    expect(await staffOn(EARLY, THURSDAY)).toEqual([MAX]);
  });

  it("swaps only the days from today on when the partner answers late", async () => {
    const anna = await member(ANNA, "anna:tok");
    const max = await member(MAX, "max:tok");
    const swap = await create(anna, { kind: "swap", partnerStaffId: MAX, from: "2026-10-06", to: FRIDAY });

    vi.setSystemTime(new Date(`${THURSDAY}T08:00:00Z`));
    const accept = await act(max, swap.json!.request.request_id, "accept");
    const days = client.mainDb.prepare("SELECT DISTINCT change_date FROM shift_day_changes ORDER BY change_date").all();

    expect(accept.json!.request.status).toBe("done");
    expect(await staffOn(EARLY, "2026-10-06")).toEqual([ANNA]);
    expect(await staffOn(EARLY, "2026-10-07")).toEqual([ANNA]);
    expect(await staffOn(EARLY, THURSDAY)).toEqual([MAX]);
    expect(await staffOn(LATE, FRIDAY)).toEqual([ANNA]);
    expect(days).toEqual([{ change_date: THURSDAY }, { change_date: FRIDAY }]);
  });

  it("leaves out weekends for teams that do not work them", async () => {
    const anna = await member(ANNA, "anna:tok");
    const max = await member(MAX, "max:tok");

    const saturday = await create(anna, { kind: "takeover", date: "2026-10-10" });
    const weekend = await create(anna, { kind: "swap", partnerStaffId: MAX, from: "2026-10-10", to: "2026-10-11" });
    const swap = await create(anna, { kind: "swap", partnerStaffId: MAX, from: FRIDAY, to: "2026-10-11" });
    await act(max, swap.json!.request.request_id, "accept");

    expect(saturday.status).toBe(400);
    expect(saturday.json!.statusMessage).toBe("Am Wochenende arbeitet dein Team nicht");
    expect(weekend.status).toBe(400);
    expect(weekend.json!.statusMessage).toBe("Im Zeitraum gibt es nichts zu tauschen");
    expect(await staffOn(EARLY, FRIDAY)).toEqual([MAX]);
    expect(await staffOn(EARLY, "2026-10-10")).toEqual([ANNA]);
    expect(await staffOn(EARLY, "2026-10-11")).toEqual([ANNA]);
  });

  it("lists for planners what is not over yet and what was decided recently", async () => {
    const insert = client.mainDb.prepare(
      `INSERT INTO shift_requests (kind, status, requester_staff_id, shift_id, date_from, date_to, created_by, created_at, decided_at)
       VALUES ('takeover', ?, 1, 1, ?, ?, 'Anna Weber', ?, ?)`
    );
    insert.run("done", "2026-12-03", "2026-12-03", "2026-08-01 08:00:00", "2026-08-02 08:00:00");
    insert.run("open", "2026-10-01", "2026-10-01", "2026-09-20 08:00:00", null);
    insert.run("cancelled", "2026-09-01", "2026-09-01", "2026-08-20 08:00:00", "2026-09-20 08:00:00");
    insert.run("cancelled", "2026-08-01", "2026-08-01", "2026-07-20 08:00:00", "2026-08-01 08:00:00");
    const planner = await client.loginAs("planner", "planner1234");

    const list = await client.request<any>("GET", "/api/requests", { jar: planner });

    expect(list.json!.requests.map((request: any) => request.request_id).sort()).toEqual([1, 3]);
  });

  it("lets the planner revert only days from today on", async () => {
    const anna = await member(ANNA, "anna:tok");
    const max = await member(MAX, "max:tok");
    const swap = (await create(anna, { kind: "swap", partnerStaffId: MAX, from: THURSDAY, to: FRIDAY })).json!.request.request_id;
    const takeover = (await create(max, { kind: "takeover", date: "2026-10-06" })).json!.request.request_id;
    await act(max, swap, "accept");
    await act(anna, takeover, "accept");
    vi.setSystemTime(new Date(`${FRIDAY}T08:00:00Z`));
    const admin = await client.loginAs("admin", "admin1234");
    const revert = (id: number) => client.request<any>("POST", `/api/requests/${id}`, { jar: admin, csrf: true, body: { action: "revert" } });

    const partly = await revert(swap);
    const over = await revert(takeover);

    expect(partly.json!.request.status).toBe("reverted");
    expect(await staffOn(EARLY, THURSDAY)).toEqual([MAX]);
    expect(await staffOn(EARLY, FRIDAY)).toEqual([ANNA]);
    expect([over.status, over.json!.statusMessage]).toEqual([409, "Die Tage der Anfrage liegen schon in der Vergangenheit"]);
  });
});
