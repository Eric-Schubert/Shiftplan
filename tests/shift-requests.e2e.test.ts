import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient, type ApiClient, type Route } from "./helpers/api-harness";

vi.mock("web-push", () => ({
  default: {
    generateVAPIDKeys: () => ({ publicKey: "test-public-key", privateKey: "test-private-key" }),
    sendNotification: vi.fn().mockResolvedValue({ statusCode: 201 }),
  },
}));

const relayCalls: Array<{ url: string; body: any }> = [];
process.env.SHIFTPLAN_PUSH_RELAY_URL = "https://relay.test";
vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
  const body = JSON.parse(String(init.body));
  relayCalls.push({ url, body });
  const payload = url.endsWith("/v1/instances")
    ? { instanceId: "inst_test", secret: "sk_test" }
    : { sent: body.tokens.length, failed: 0, invalidTokens: [] };
  return new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } });
});

const ROUTES: Route[] = [
  ["post", "/api/auth/login", "server/api/auth/login.post"],
  ["get", "/api/shiftplan", "server/api/shiftplan/index.get"],
  ["post", "/api/push/devices", "server/api/push/devices.post"],
  ["post", "/api/member/redeem", "server/api/member/redeem.post"],
  ["post", "/api/member/absences", "server/api/member/absences/index.post"],
  ["delete", "/api/member/absences/:id", "server/api/member/absences/[id].delete"],
  ["get", "/api/member/requests", "server/api/member/requests/index.get"],
  ["post", "/api/member/requests", "server/api/member/requests/index.post"],
  ["post", "/api/member/requests/:id", "server/api/member/requests/[id].post"],
  ["get", "/api/requests", "server/api/requests/index.get"],
  ["post", "/api/requests/settings", "server/api/requests/settings.put"],
  ["post", "/api/requests/:id", "server/api/requests/[id].post"],
  ["post", "/api/member-invites", "server/api/member-invites/index.post"],
];

const ANNA = 1;
const MAX = 2;
const EARLY = 1;
const LATE = 2;
// KW 41/2026: Monday 05.10. to Sunday 11.10. The clock is set to Monday.
const THURSDAY = "2026-10-08";
const FRIDAY = "2026-10-09";

let client: ApiClient;

function bearer(token: string) {
  return { authorization: `Bearer ${token}` };
}

async function member(staffId: number, pushToken: string) {
  const planner = await client.loginAs("planner", "planner1234");
  const invite = await client.request<{ code: string }>("POST", "/api/member-invites", {
    jar: planner,
    csrf: true,
    body: { staffId },
  });
  const redeem = await client.request<{ token: string }>("POST", "/api/member/redeem", {
    body: { code: invite.json!.code, deviceName: "Test" },
  });
  const token = redeem.json!.token;
  await client.request("POST", "/api/push/devices", { headers: bearer(token), body: { platform: "ios", token: pushToken } });
  return token;
}

/** Who works the shift on that day according to the plan API (weekly plan plus day changes). */
async function staffOn(shiftId: number, date: string): Promise<number[]> {
  const plan = await client.request<any>("GET", "/api/shiftplan?year=2026&week=41");
  const shift = plan.json!.shifts.find((entry: any) => entry.shift_id === shiftId);
  const ids = new Set<number>(shift.assigned_staff.map((staff: any) => staff.staff_id));
  for (const change of plan.json!.day_changes) {
    if (change.shift_id !== shiftId || change.change_date !== date) continue;
    if (change.kind === "add") ids.add(change.staff_id);
    else ids.delete(change.staff_id);
  }
  return [...ids].sort();
}

function sends() {
  return relayCalls.filter((call) => call.url.endsWith("/v1/send"));
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-05T08:00:00Z") });
  relayCalls.length = 0;
  client = await createApiClient(ROUTES, (db) => {
    db.prepare("INSERT INTO staff (name, active, is_parttime) VALUES ('Anna Weber', 1, 0)").run();
    db.prepare("INSERT INTO staff (name, active, is_parttime) VALUES ('Max Mustermann', 1, 0)").run();
    db.prepare(
      "INSERT INTO shifts (name, active, start_time, end_time, color, min_staff, sort_order) VALUES ('Früh', 1, '06:00', '14:00', '#22c55e', 1, 1)"
    ).run();
    db.prepare(
      "INSERT INTO shifts (name, active, start_time, end_time, color, min_staff, sort_order) VALUES ('Spät', 1, '14:00', '22:00', '#3b82f6', 1, 2)"
    ).run();
    db.prepare("INSERT INTO weeks (year, week_number) VALUES (2026, 41)").run();
    db.prepare("INSERT INTO shift_assignments (staff_id, shift_id, week_id) VALUES (?, ?, 1)").run(ANNA, EARLY);
    db.prepare("INSERT INTO shift_assignments (staff_id, shift_id, week_id) VALUES (?, ?, 1)").run(MAX, LATE);
  });
});

afterEach(() => {
  client.close();
  vi.useRealTimers();
});

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

describe("planner approval", () => {
  it("waits for the planner when approval is required, and the planner can revert", async () => {
    const planner = await client.loginAs("admin", "admin1234");
    const setting = await client.request<any>("POST", "/api/requests/settings", {
      jar: planner,
      csrf: true,
      body: { requiresApproval: true },
    });
    const anna = await member(ANNA, "anna:tok");
    const max = await member(MAX, "max:tok");
    const created = await client.request<any>("POST", "/api/member/requests", {
      headers: bearer(anna),
      body: { kind: "takeover", date: THURSDAY },
    });
    const id = created.json!.request.request_id;

    const accept = await client.request<any>("POST", `/api/member/requests/${id}`, { headers: bearer(max), body: { action: "accept" } });
    const beforeApproval = await staffOn(EARLY, THURSDAY);
    const pending = await client.request<any>("GET", "/api/requests", { jar: planner });
    const approve = await client.request<any>("POST", `/api/requests/${id}`, { jar: planner, csrf: true, body: { action: "approve" } });
    const afterApproval = await staffOn(EARLY, THURSDAY);
    const revert = await client.request<any>("POST", `/api/requests/${id}`, { jar: planner, csrf: true, body: { action: "revert" } });

    expect(setting.json).toEqual({ requiresApproval: true });
    expect(accept.json!.request.status).toBe("pending_approval");
    expect(beforeApproval).toEqual([ANNA]);
    expect(pending.json!.requests[0]).toMatchObject({ request_id: id, status: "pending_approval" });
    expect(approve.json!.request).toMatchObject({ status: "done", decided_by: "admin" });
    expect(afterApproval).toEqual([MAX]);
    expect(revert.json!.request.status).toBe("reverted");
    expect(await staffOn(EARLY, THURSDAY)).toEqual([ANNA]);
    expect(await staffOn(LATE, THURSDAY)).toEqual([MAX]);
  });

  it("keeps the setting for admins only", async () => {
    const planner = await client.loginAs("planner", "planner1234");
    const response = await client.request("POST", "/api/requests/settings", {
      jar: planner,
      csrf: true,
      body: { requiresApproval: true },
    });
    expect(response.status).toBe(403);
  });
});
