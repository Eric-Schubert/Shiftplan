import { describe, expect, it, vi } from "vitest";
import {
  ANNA,
  EARLY,
  FRIDAY,
  LATE,
  MAX,
  THURSDAY,
  act,
  bearer,
  client,
  member,
  requireApproval,
  staffOn,
  useShiftRequestClient,
} from "./helpers/shift-requests";
import { webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
useShiftRequestClient();

function create(token: string, body: Record<string, unknown>) {
  return client.request<any>("POST", "/api/member/requests", { headers: bearer(token), body });
}

function reportAbsence(token: string, date: string) {
  return client.request("POST", "/api/member/absences", { headers: bearer(token), body: { date, reason: "privat", notifyTeam: false } });
}

describe("checks before a request changes the plan", () => {
  it("never swaps someone into a shift on a day they are away", async () => {
    const anna = await member(ANNA, "anna:tok");
    const max = await member(MAX, "max:tok");
    await reportAbsence(anna, THURSDAY);
    const absentRequester = await create(anna, { kind: "swap", partnerStaffId: MAX, from: THURSDAY, to: FRIDAY });

    const swap = await create(max, { kind: "swap", partnerStaffId: ANNA, from: FRIDAY, to: FRIDAY });
    await reportAbsence(anna, FRIDAY);
    const accept = await act(anna, swap.json!.request.request_id, "accept");

    expect(absentRequester.status).toBe(400);
    expect(absentRequester.json!.statusMessage).toBe("Anna Weber hat am Do. 08.10. einen Ausfall eingetragen");
    expect(swap.status).toBe(200);
    expect(accept.status).toBe(409);
    expect(accept.json!.statusMessage).toBe("Anna Weber hat am Fr. 09.10. einen Ausfall eingetragen");
    expect(await staffOn(LATE, FRIDAY)).toEqual([MAX]);
  });

  it("refuses a takeover when the requester no longer works the shift", async () => {
    const anna = await member(ANNA, "anna:tok");
    const max = await member(MAX, "max:tok");
    const created = await create(anna, { kind: "takeover", date: THURSDAY });
    const planner = await client.loginAs("planner", "planner1234");
    await client.request("POST", "/api/shiftplan/day-change", {
      jar: planner,
      csrf: true,
      body: { staff_id: ANNA, shift_id: EARLY, date: THURSDAY, present: false },
    });

    const accept = await act(max, created.json!.request.request_id, "accept");

    expect(accept.status).toBe(409);
    expect(accept.json!.statusMessage).toBe("Anna Weber ist an dem Tag nicht mehr in dieser Schicht");
    expect(await staffOn(EARLY, THURSDAY)).toEqual([]);
    expect(await staffOn(LATE, THURSDAY)).toEqual([MAX]);
  });

  it("checks again when the planner approves", async () => {
    let admin = await requireApproval();
    const anna = await member(ANNA, "anna:tok");
    const max = await member(MAX, "max:tok");
    const approve = (id: number) =>
      client.request<any>("POST", `/api/requests/${id}`, { jar: admin, csrf: true, body: { action: "approve" } });
    const thursday = (await create(anna, { kind: "takeover", date: THURSDAY })).json!.request.request_id;
    const friday = (await create(anna, { kind: "takeover", date: FRIDAY })).json!.request.request_id;
    await act(max, thursday, "accept");
    await act(max, friday, "accept");

    await reportAbsence(max, THURSDAY);
    const helperAway = await approve(thursday);
    vi.setSystemTime(new Date("2026-10-10T08:00:00Z"));
    admin = await client.loginAs("admin", "admin1234");
    const dayOver = await approve(friday);

    expect(helperAway.status).toBe(409);
    expect(helperAway.json!.statusMessage).toBe("Max Mustermann hat am Do. 08.10. einen Ausfall eingetragen");
    expect(dayOver.status).toBe(409);
    expect(dayOver.json!.statusMessage).toBe("Die Anfrage ist abgelaufen");
    expect(await staffOn(EARLY, THURSDAY)).toEqual([ANNA]);
    expect(await staffOn(EARLY, FRIDAY)).toEqual([ANNA]);
  });

  it("allows only one unfinished swap between two people for the same days", async () => {
    const anna = await member(ANNA, "anna:tok");
    const max = await member(MAX, "max:tok");
    const first = await create(anna, { kind: "swap", partnerStaffId: MAX, from: THURSDAY, to: FRIDAY });

    const twice = await create(anna, { kind: "swap", partnerStaffId: MAX, from: THURSDAY, to: THURSDAY });
    const reverse = await create(max, { kind: "swap", partnerStaffId: ANNA, from: FRIDAY, to: FRIDAY });
    await act(max, first.json!.request.request_id, "decline");
    const again = await create(max, { kind: "swap", partnerStaffId: ANNA, from: FRIDAY, to: FRIDAY });

    expect(twice.status).toBe(409);
    expect(reverse.status).toBe(409);
    expect(reverse.json!.statusMessage).toBe("Für diesen Zeitraum läuft schon eine Tauschanfrage mit dieser Person");
    expect(again.status).toBe(200);
  });
});
