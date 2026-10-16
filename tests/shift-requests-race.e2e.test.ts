import { describe, expect, it, vi } from "vitest";
import {
  ANNA,
  EARLY,
  FRIDAY,
  LATE,
  MAX,
  PAUL,
  THURSDAY,
  act,
  bearer,
  client,
  member,
  requireApproval,
  sends,
  staffOn,
  useShiftRequestClient,
} from "./helpers/shift-requests";
import { webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
useShiftRequestClient();

function create(token: string, body: Record<string, unknown>) {
  return client.request<any>("POST", "/api/member/requests", { headers: bearer(token), body });
}

describe("requests decided twice or withdrawn", () => {
  it("applies an approval only once when two arrive together", async () => {
    const admin = await requireApproval();
    const anna = await member(ANNA, "anna:tok");
    const max = await member(MAX, "max:tok");
    const id = (await create(anna, { kind: "takeover", date: THURSDAY })).json!.request.request_id;
    await act(max, id, "accept");
    const approve = () => client.request("POST", `/api/requests/${id}`, { jar: admin, csrf: true, body: { action: "approve" } });

    const results = await Promise.all([approve(), approve()]);
    const stored = client.mainDb.prepare("SELECT applied_changes FROM shift_requests WHERE request_id = ?").get(id) as {
      applied_changes: string;
    };
    await client.request("POST", `/api/requests/${id}`, { jar: admin, csrf: true, body: { action: "revert" } });

    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    expect(JSON.parse(stored.applied_changes)).toHaveLength(3);
    expect(await staffOn(EARLY, THURSDAY)).toEqual([ANNA]);
    expect(await staffOn(LATE, THURSDAY)).toEqual([MAX]);
  });

  it("lets only one colleague take over when two accept together", async () => {
    const anna = await member(ANNA, "anna:tok");
    const max = await member(MAX, "max:tok");
    const paul = await member(PAUL, "paul:tok");
    const id = (await create(anna, { kind: "takeover", date: THURSDAY })).json!.request.request_id;

    const results = await Promise.all([act(max, id, "accept"), act(paul, id, "accept")]);

    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    expect((await staffOn(EARLY, THURSDAY)).length).toBe(1);
  });

  it("refuses a second yes once the first went through, for takeovers and swaps", async () => {
    const anna = await member(ANNA, "anna:tok");
    const max = await member(MAX, "max:tok");
    const paul = await member(PAUL, "paul:tok");
    const takeover = (await create(anna, { kind: "takeover", date: THURSDAY })).json!.request.request_id;
    const swap = (await create(anna, { kind: "swap", partnerStaffId: MAX, from: FRIDAY, to: FRIDAY })).json!.request.request_id;

    const first = await act(max, takeover, "accept");
    const second = await act(paul, takeover, "accept");
    const swapFirst = await act(max, swap, "accept");
    const swapSecond = await act(max, swap, "accept");

    expect([first.status, second.status, swapFirst.status, swapSecond.status]).toEqual([200, 409, 200, 409]);
    expect([second.json!.data.code, swapSecond.json!.data.code]).toEqual(["errors.requests.notOpen", "errors.requests.notOpen"]);
    expect(await staffOn(EARLY, THURSDAY)).toEqual([MAX]);
    expect(await staffOn(EARLY, FRIDAY)).toEqual([MAX]);
  });

  it("tells the colleague when the requester withdraws", async () => {
    const anna = await member(ANNA, "anna:tok");
    await member(MAX, "max:tok");
    const swap = await create(anna, { kind: "swap", partnerStaffId: MAX, from: THURSDAY, to: THURSDAY });

    const cancelled = await act(anna, swap.json!.request.request_id, "cancel");

    expect(cancelled.json!.request.status).toBe("cancelled");
    expect(sends().at(-1)!.body).toMatchObject({
      tokens: ["max:tok"],
      notification: { title: "Anfrage zurückgezogen", body: "Anna Weber hat die Anfrage (Do. 08.10.) zurückgezogen." },
    });
  });

  it("gives a takeover back to the team when the helper is deactivated", async () => {
    const admin = await requireApproval();
    const anna = await member(ANNA, "anna:tok");
    const max = await member(MAX, "max:tok");
    const id = (await create(anna, { kind: "takeover", date: THURSDAY })).json!.request.request_id;
    await act(max, id, "accept");

    await client.request("PATCH", `/api/staff/${MAX}`, { jar: admin, csrf: true, body: { active: false } });
    const list = await client.request<any>("GET", "/api/member/requests", { headers: bearer(anna) });

    expect(list.json!.requests[0]).toMatchObject({ request_id: id, status: "open", partner_staff_id: null });
  });
});
