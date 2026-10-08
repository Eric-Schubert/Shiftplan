import { describe, expect, it, vi } from "vitest";
import {
  ANNA,
  EARLY,
  FRIDAY,
  LATE,
  MAX,
  THURSDAY,
  bearer,
  client,
  member,
  sends,
  staffOn,
  useShiftRequestClient,
} from "./helpers/shift-requests";
import { webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
useShiftRequestClient();

describe("swap requests", () => {
  it("swaps all shifts of two people for the chosen range after the partner agrees", async () => {
    const anna = await member(ANNA, "anna:tok");
    const max = await member(MAX, "max:tok");
    const created = await client.request<any>("POST", "/api/member/requests", {
      headers: bearer(anna),
      body: { kind: "swap", partnerStaffId: MAX, from: THURSDAY, to: FRIDAY, message: "Arzttermin" },
    });
    const invitePush = sends().at(-1)!;
    const id = created.json!.request.request_id;

    const notMine = await client.request("POST", `/api/member/requests/${id}`, { headers: bearer(anna), body: { action: "accept" } });
    const accept = await client.request<any>("POST", `/api/member/requests/${id}`, { headers: bearer(max), body: { action: "accept" } });

    expect(created.status).toBe(200);
    expect(invitePush.body).toMatchObject({
      tokens: ["max:tok"],
      notification: {
        title: "Tauschanfrage",
        body: "Anna Weber möchte Do. 08.10. – Fr. 09.10. die Schichten mit dir tauschen.\nArzttermin",
      },
    });
    expect(notMine.status).toBe(404);
    expect(accept.json!.request.status).toBe("done");
    for (const day of [THURSDAY, FRIDAY]) {
      expect(await staffOn(EARLY, day)).toEqual([MAX]);
      expect(await staffOn(LATE, day)).toEqual([ANNA]);
    }
    expect(await staffOn(EARLY, "2026-10-07")).toEqual([ANNA]);
    const audit = client.mainDb.prepare("SELECT action, staff_name, reason FROM audit_log ORDER BY audit_id LIMIT 2").all();
    expect(audit).toEqual([
      { action: "day_remove", staff_name: "Anna Weber", reason: "Tausch Anna Weber ↔ Max Mustermann, Do. 08.10." },
      { action: "day_add", staff_name: "Max Mustermann", reason: "Tausch Anna Weber ↔ Max Mustermann, Do. 08.10." },
    ]);
  });

  it("lets the partner decline and the requester cancel", async () => {
    const anna = await member(ANNA, "anna:tok");
    const max = await member(MAX, "max:tok");
    const swap = (from: string, to: string) =>
      client.request<any>("POST", "/api/member/requests", {
        headers: bearer(anna),
        body: { kind: "swap", partnerStaffId: MAX, from, to },
      });

    const first = await swap(THURSDAY, THURSDAY);
    const declined = await client.request<any>("POST", `/api/member/requests/${first.json!.request.request_id}`, {
      headers: bearer(max),
      body: { action: "decline" },
    });
    const declinePush = sends().at(-1)!;
    const second = await swap(FRIDAY, FRIDAY);
    const cancelled = await client.request<any>("POST", `/api/member/requests/${second.json!.request.request_id}`, {
      headers: bearer(anna),
      body: { action: "cancel" },
    });
    const empty = await swap("2026-10-20", "2026-10-21");
    const tooLong = await swap("2026-10-06", "2026-12-31");

    expect(declined.json!.request.status).toBe("declined");
    expect(declinePush.body).toMatchObject({ tokens: ["anna:tok"], notification: { title: "Tausch abgelehnt" } });
    expect(cancelled.json!.request.status).toBe("cancelled");
    expect(empty.status).toBe(400);
    expect(tooLong.status).toBe(400);
    expect(await staffOn(EARLY, THURSDAY)).toEqual([ANNA]);
  });
});
