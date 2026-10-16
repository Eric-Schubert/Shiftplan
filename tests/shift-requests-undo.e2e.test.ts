import { describe, expect, it, vi } from "vitest";
import { ANNA, EARLY, LATE, MAX, THURSDAY, bearer, client, member, sends, staffOn, useShiftRequestClient } from "./helpers/shift-requests";
import { webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
useShiftRequestClient();

/** Anna gives away „Früh“ on Thursday and Max takes it over. */
async function doneTakeover() {
  const anna = await member(ANNA, "anna:tok");
  const max = await member(MAX, "max:tok");
  const created = await client.request<any>("POST", "/api/member/requests", {
    headers: bearer(anna),
    body: { kind: "takeover", date: THURSDAY },
  });
  const id = created.json!.request.request_id;
  await client.request("POST", `/api/member/requests/${id}`, { headers: bearer(max), body: { action: "accept" } });
  return { anna, max, id };
}

function act(token: string, id: number, action: string) {
  return client.request<any>("POST", `/api/member/requests/${id}`, { headers: bearer(token), body: { action } });
}

describe("undo of a finished request by staff", () => {
  it("puts the plan back once the other person confirms", async () => {
    const { anna, max, id } = await doneTakeover();

    const asked = await act(max, id, "request_undo");
    const askPush = sends().at(-1)!.body;
    const confirmed = await act(anna, id, "confirm_undo");

    expect(asked.json!.request).toMatchObject({ status: "done", undo_requested_by: MAX });
    expect(askPush).toMatchObject({ tokens: ["anna:tok"], notification: { title: "Storno angefragt" } });
    expect(confirmed.json!.request).toMatchObject({ status: "reverted", decided_by: "Anna Weber", undo_requested_by: MAX });
    expect(await staffOn(EARLY, THURSDAY)).toEqual([ANNA]);
    expect(await staffOn(LATE, THURSDAY)).toEqual([MAX]);
    expect(sends().at(-1)!.body).toMatchObject({ tokens: ["max:tok"], notification: { title: "Storno bestätigt" } });
  });

  it("keeps the plan when the other person declines or the asker takes it back", async () => {
    const { anna, max, id } = await doneTakeover();

    await act(max, id, "request_undo");
    const declined = await act(anna, id, "decline_undo");
    const declinePush = sends().at(-1)!.body;
    await act(anna, id, "request_undo");
    const withdrawn = await act(anna, id, "decline_undo");

    expect(declined.json!.request).toMatchObject({ status: "done", undo_requested_by: null });
    expect(declinePush).toMatchObject({ tokens: ["max:tok"], notification: { title: "Storno abgelehnt" } });
    expect(withdrawn.json!.request).toMatchObject({ status: "done", undo_requested_by: null });
    expect(await staffOn(EARLY, THURSDAY)).toEqual([MAX]);
  });

  it("refuses self-confirmation, double asks, missing asks and the day itself", async () => {
    const { anna, max, id } = await doneTakeover();

    const nothingAsked = await act(anna, id, "confirm_undo");
    await act(max, id, "request_undo");
    const self = await act(max, id, "confirm_undo");
    const twice = await act(anna, id, "request_undo");
    vi.setSystemTime(new Date(`${THURSDAY}T06:00:00Z`));
    const sameDay = await act(anna, id, "confirm_undo");

    expect(nothingAsked.status).toBe(409);
    expect(self.status).toBe(409);
    expect(twice.status).toBe(409);
    expect(sameDay.status).toBe(409);
    expect(await staffOn(EARLY, THURSDAY)).toEqual([MAX]);
  });

  it("refuses when the person getting the shift back is away that day", async () => {
    const { anna, max, id } = await doneTakeover();
    await client.request("POST", "/api/member/absences", {
      headers: bearer(anna),
      body: { date: THURSDAY, reason: "urlaub", notifyTeam: false },
    });

    const asked = await act(max, id, "request_undo");

    expect(asked.status).toBe(409);
    expect(asked.json!.statusMessage).toContain("Anna Weber");
  });

  it("lets the helper withdraw an acceptance that waits for approval", async () => {
    const planner = await client.loginAs("admin", "admin1234");
    await client.request("POST", "/api/requests/settings", { jar: planner, csrf: true, body: { requiresApproval: true } });
    const anna = await member(ANNA, "anna:tok");
    const max = await member(MAX, "max:tok");
    const created = await client.request<any>("POST", "/api/member/requests", {
      headers: bearer(anna),
      body: { kind: "takeover", date: THURSDAY },
    });
    const id = created.json!.request.request_id;
    await act(max, id, "accept");

    const withdrawn = await act(max, id, "cancel");

    expect(withdrawn.json!.request).toMatchObject({ status: "open", partner_staff_id: null });
    expect(sends().at(-1)!.body).toMatchObject({ tokens: ["anna:tok"], notification: { title: "Zusage zurückgezogen" } });
  });
});
