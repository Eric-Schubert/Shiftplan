import { describe, expect, it, vi } from "vitest";
import { ANNA, EARLY, MAX, THURSDAY, bearer, client, member, staffOn, useShiftRequestClient } from "./helpers/shift-requests";
import { webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
useShiftRequestClient();

function act(token: string, id: number, action: string) {
  return client.request<any>("POST", `/api/member/requests/${id}`, { headers: bearer(token), body: { action } });
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
});
