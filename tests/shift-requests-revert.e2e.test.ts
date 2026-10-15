import { describe, expect, it, vi } from "vitest";
import {
  ANNA,
  EARLY,
  LATE,
  MAX,
  PAUL,
  THURSDAY,
  act,
  bearer,
  client,
  member,
  staffOn,
  useShiftRequestClient,
} from "./helpers/shift-requests";
import { webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
useShiftRequestClient();

/** `from` gives away Früh on Thursday and `helper` takes it over. */
async function takeover(from: string, helper: string) {
  const created = await client.request<any>("POST", "/api/member/requests", {
    headers: bearer(from),
    body: { kind: "takeover", date: THURSDAY, shiftId: EARLY },
  });
  const id = created.json!.request.request_id as number;
  await act(helper, id, "accept");
  return id;
}

async function revert(id: number) {
  const admin = await client.loginAs("admin", "admin1234");
  return client.request<any>("POST", `/api/requests/${id}`, { jar: admin, csrf: true, body: { action: "revert" } });
}

describe("undo after the plan moved on", () => {
  it("refuses to undo a request a later one builds on, until that one is undone", async () => {
    const anna = await member(ANNA, "anna:tok");
    const max = await member(MAX, "max:tok");
    const paul = await member(PAUL, "paul:tok");
    const first = await takeover(anna, max);
    const second = await takeover(max, paul);

    const ask = await act(anna, first, "request_undo");
    const plannerFirst = await revert(first);
    const plannerSecond = await revert(second);
    const plannerAgain = await revert(first);

    expect(ask.status).toBe(409);
    expect(ask.json!.statusMessage).toBe("Der Plan hat sich seitdem geändert. Bitte wende dich an die Planung.");
    expect(plannerFirst.status).toBe(409);
    expect([plannerSecond.status, plannerAgain.status]).toEqual([200, 200]);
    expect(await staffOn(EARLY, THURSDAY)).toEqual([ANNA]);
    expect(await staffOn(LATE, THURSDAY)).toEqual([MAX]);
  });

  it("skips changes of a deleted shift and puts back the rest", async () => {
    const anna = await member(ANNA, "anna:tok");
    const max = await member(MAX, "max:tok");
    const id = await takeover(anna, max);
    const admin = await client.loginAs("admin", "admin1234");
    await client.request("DELETE", `/api/shift/${LATE}`, { jar: admin, csrf: true });

    const reverted = await revert(id);

    expect(reverted.json!.request.status).toBe("reverted");
    expect(await staffOn(EARLY, THURSDAY)).toEqual([ANNA]);
  });

  it("refuses an undo while the asker is away that day", async () => {
    const anna = await member(ANNA, "anna:tok");
    const max = await member(MAX, "max:tok");
    const id = await takeover(anna, max);
    await client.request("POST", "/api/member/absences", {
      headers: bearer(anna),
      body: { date: THURSDAY, reason: "privat", notifyTeam: false },
    });

    const asked = await act(anna, id, "request_undo");

    expect(asked.status).toBe(409);
    expect(asked.json!.statusMessage).toBe("Anna Weber ist an dem Tag abwesend und kann nichts zurücknehmen");
  });

  it("drops undo asks of deactivated people and refuses to give them shifts back", async () => {
    const anna = await member(ANNA, "anna:tok");
    const max = await member(MAX, "max:tok");
    const id = await takeover(anna, max);
    await act(anna, id, "request_undo");
    const admin = await client.loginAs("admin", "admin1234");

    await client.request("PATCH", `/api/staff/${ANNA}`, { jar: admin, csrf: true, body: { active: false } });
    const ask = client.mainDb.prepare("SELECT undo_requested_by FROM shift_requests WHERE request_id = ?").get(id);
    client.mainDb.prepare("UPDATE shift_requests SET undo_requested_by = ? WHERE request_id = ?").run(ANNA, id);
    const confirm = await act(max, id, "confirm_undo");

    expect(ask).toEqual({ undo_requested_by: null });
    expect(confirm.status).toBe(409);
    expect(confirm.json!.statusMessage).toBe("Anna Weber ist nicht mehr im Team");
    expect(await staffOn(EARLY, THURSDAY)).toEqual([MAX]);
  });

  it("clears undo asks on a planner revert and once the day has come", async () => {
    const anna = await member(ANNA, "anna:tok");
    const max = await member(MAX, "max:tok");
    const reverted = await takeover(anna, max);
    await act(anna, reverted, "request_undo");
    const planner = await revert(reverted);

    const pending = await takeover(anna, max);
    await act(max, pending, "request_undo");
    vi.setSystemTime(new Date(`${THURSDAY}T08:00:00Z`));
    const list = await client.request<any>("GET", "/api/member/requests", { headers: bearer(anna) });

    expect(planner.json!.request).toMatchObject({ status: "reverted", undo_requested_by: null });
    expect(list.json!.requests.find((request: any) => request.request_id === pending)).toMatchObject({
      status: "done",
      undo_requested_by: null,
    });
  });
});
