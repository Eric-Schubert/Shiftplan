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

describe("takeover requests", () => {
  it("lets a colleague take over a reported absence for that day only", async () => {
    const anna = await member(ANNA, "anna:tok");
    const max = await member(MAX, "max:tok");

    const report = await client.request<any>("POST", "/api/member/absences", {
      headers: bearer(anna),
      body: { date: THURSDAY, reason: "privat", seekTakeover: true },
    });
    const absencePush = sends().at(-1)!;
    const list = await client.request<any>("GET", "/api/member/requests", { headers: bearer(max) });
    const request = list.json!.requests[0];

    expect(report.status).toBe(200);
    expect(absencePush.body.notification.body).toBe("Anna Weber fällt Do. 08.10. aus – Früh offen – wer übernimmt?");
    expect(absencePush.body.tokens).toEqual(["max:tok"]);
    expect(request).toMatchObject({ kind: "takeover", status: "open", requester_name: "Anna Weber", shift_name: "Früh" });

    const accept = await client.request<any>("POST", `/api/member/requests/${request.request_id}`, {
      headers: bearer(max),
      body: { action: "accept" },
    });

    expect(accept.status).toBe(200);
    expect(accept.json!.request).toMatchObject({ status: "done", partner_name: "Max Mustermann" });
    expect(await staffOn(EARLY, THURSDAY)).toEqual([MAX]);
    expect(await staffOn(LATE, THURSDAY)).toEqual([]);
    // Only Thursday changes.
    expect(await staffOn(EARLY, FRIDAY)).toEqual([ANNA]);
    expect(await staffOn(LATE, FRIDAY)).toEqual([MAX]);
    expect(sends().at(-1)!.body).toMatchObject({
      tokens: ["anna:tok"],
      notification: { title: "Schicht übernommen", body: "Max Mustermann übernimmt Früh, Do. 08.10.." },
    });
  });

  it("refuses own shifts, absent helpers, taken requests and past days", async () => {
    const anna = await member(ANNA, "anna:tok");
    const max = await member(MAX, "max:tok");
    const created = await client.request<any>("POST", "/api/member/requests", {
      headers: bearer(anna),
      body: { kind: "takeover", date: THURSDAY },
    });
    const id = created.json!.request.request_id;

    const own = await client.request("POST", `/api/member/requests/${id}`, { headers: bearer(anna), body: { action: "accept" } });
    await client.request("POST", "/api/member/absences", {
      headers: bearer(max),
      body: { date: THURSDAY, reason: "urlaub", notifyTeam: false },
    });
    const absent = await client.request("POST", `/api/member/requests/${id}`, { headers: bearer(max), body: { action: "accept" } });
    const past = await client.request("POST", "/api/member/requests", {
      headers: bearer(anna),
      body: { kind: "takeover", date: "2026-10-02" },
    });
    const twice = await client.request("POST", "/api/member/requests", {
      headers: bearer(anna),
      body: { kind: "takeover", date: THURSDAY },
    });

    expect(created.status).toBe(200);
    expect(own.status).toBe(400);
    expect(absent.status).toBe(400);
    expect(past.status).toBe(400);
    expect(twice.status).toBe(409);
  });

  it("closes open takeovers when the absence is withdrawn", async () => {
    const anna = await member(ANNA, "anna:tok");
    const max = await member(MAX, "max:tok");
    const report = await client.request<any>("POST", "/api/member/absences", {
      headers: bearer(anna),
      body: { date: THURSDAY, reason: "privat", seekTakeover: true, notifyTeam: false },
    });
    await client.request("DELETE", `/api/member/absences/${report.json!.absence.absence_id}`, { headers: bearer(anna) });
    const list = await client.request<any>("GET", "/api/member/requests", { headers: bearer(max) });

    expect(list.json!.requests).toEqual([]);
  });
});
