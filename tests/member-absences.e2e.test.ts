import { describe, expect, it, vi } from "vitest";
import {
  ANNA,
  EARLY,
  FCM_ENDPOINT,
  MAX,
  THURSDAY,
  bearer,
  client,
  inviteAndRedeem,
  useMemberAccessClient,
} from "./helpers/member-access";
import { relayCalls } from "./helpers/relay-stub";
import { KEYS, sendNotification, webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
useMemberAccessClient();

describe("absences", () => {
  it("lets staff report their own absence and tells the team without the reason", async () => {
    const anna = await inviteAndRedeem(ANNA);
    const max = await inviteAndRedeem(MAX, "Pixel von Max");
    await client.request("POST", "/api/push/devices", { headers: bearer(anna.token), body: { platform: "ios", token: "anna:APA91b" } });
    await client.request("POST", "/api/push/devices", { headers: bearer(max.token), body: { platform: "android", token: "max:APA91b" } });
    await client.request("POST", "/api/push/subscribe", { body: { endpoint: FCM_ENDPOINT, keys: KEYS } });

    const report = await client.request<{ absence: any; notified: { sent: number } }>("POST", "/api/member/absences", {
      headers: bearer(anna.token),
      body: { date: THURSDAY, reason: "urlaub", message: "Bin ab Freitag wieder da" },
    });
    const send = relayCalls.find((call) => call.url.endsWith("/v1/send"))!;
    const webPush = JSON.parse(sendNotification.mock.calls[0]![1]);

    expect(report.status).toBe(200);
    expect(report.json!.absence).toMatchObject({ staff_name: "Anna Weber", shift_name: "Frühschicht", source: "app" });
    expect(report.json!.notified).toEqual({ sent: 2, failed: 0 });
    expect(send.body.tokens).toEqual(["max:APA91b"]);
    expect(send.body.notification).toEqual({
      title: "Ausfall im Team",
      body: "Anna Weber fällt Do. 08.10. aus – Frühschicht offen\nBin ab Freitag wieder da",
    });
    expect(send.body.data).toMatchObject({ url: "/?year=2026&week=41", year: "2026", week: "41" });
    expect(webPush.body).toContain("Anna Weber fällt Do. 08.10. aus");
    expect(JSON.stringify([send, webPush])).not.toContain("urlaub");
  });

  it("accepts unplanned days and skips days that already have an absence", async () => {
    const anna = await inviteAndRedeem(ANNA);
    const max = await inviteAndRedeem(MAX);
    const report = (token: string, from: string, to?: string) =>
      client.request<{ absences: any[]; skipped: string[] }>("POST", "/api/member/absences", {
        headers: bearer(token),
        body: { from, to, reason: "privat", notifyTeam: false },
      });

    const unassigned = await report(max.token, THURSDAY);
    const first = await report(anna.token, THURSDAY);
    const duplicate = await report(anna.token, THURSDAY);
    const overlapping = await report(anna.token, "2026-10-07", "2026-10-09");
    const invalidDate = await report(anna.token, "2026-02-30");
    const backwards = await report(anna.token, "2026-10-09", "2026-10-07");
    const tooLong = await report(anna.token, "2026-10-01", "2026-12-31");

    expect(unassigned.status).toBe(200);
    expect(unassigned.json!.absences[0]).toMatchObject({ shift_id: null, batch_id: null });
    expect(first.status).toBe(200);
    expect(duplicate.status).toBe(409);
    expect(overlapping.status).toBe(200);
    expect(overlapping.json!.absences.map((absence) => absence.absence_date)).toEqual(["2026-10-07", "2026-10-09"]);
    expect(overlapping.json!.skipped).toEqual([THURSDAY]);
    expect(invalidDate.status).toBe(400);
    expect(backwards.status).toBe(400);
    expect(tooLong.status).toBe(400);
  });

  it("enters a range across weeks with one push and withdraws it as a whole", async () => {
    const anna = await inviteAndRedeem(ANNA);
    const max = await inviteAndRedeem(MAX, "Pixel von Max");
    await client.request("POST", "/api/push/devices", { headers: bearer(max.token), body: { platform: "android", token: "max:APA91b" } });

    const report = await client.request<{ absences: any[] }>("POST", "/api/member/absences", {
      headers: bearer(anna.token),
      body: { from: "2026-10-08", to: "2026-10-14", reason: "urlaub" },
    });
    const sends = relayCalls.filter((call) => call.url.endsWith("/v1/send"));
    const week41 = await client.request<any[]>("GET", "/api/absences?year=2026&week=41", { headers: bearer(anna.token) });
    const week42 = await client.request<any[]>("GET", "/api/absences?year=2026&week=42", { headers: bearer(anna.token) });

    expect(report.status).toBe(200);
    expect(report.json!.absences).toHaveLength(7);
    // Only KW 41 is planned: those days carry the shift, the rest stays without one.
    expect(report.json!.absences.map((absence) => absence.shift_id)).toEqual([EARLY, EARLY, EARLY, EARLY, null, null, null]);
    expect(new Set(report.json!.absences.map((absence) => absence.batch_id)).size).toBe(1);
    expect(sends).toHaveLength(1);
    expect(sends[0]!.body.notification.body).toBe("Anna Weber fällt Do. 08.10. – Mi. 14.10. aus");
    expect(week41.json).toHaveLength(4);
    expect(week42.json![0]).toMatchObject({ range_from: "2026-10-08", range_to: "2026-10-14" });

    const single = await client.request("DELETE", `/api/member/absences/${report.json!.absences[0].absence_id}`, {
      headers: bearer(anna.token),
    });
    const afterSingle = await client.request<any[]>("GET", "/api/absences?year=2026&week=42");
    const whole = await client.request<{ cancelled: number }>(
      "DELETE",
      `/api/member/absences/${report.json!.absences[6].absence_id}?range=1`,
      { headers: bearer(anna.token) }
    );
    const remaining = client.mainDb.prepare("SELECT COUNT(*) AS count FROM absences WHERE cancelled_at IS NULL").get() as {
      count: number;
    };
    const audit = client.mainDb.prepare("SELECT action, week_number, reason FROM audit_log ORDER BY audit_id").all();

    expect(single.status).toBe(200);
    expect(afterSingle.json![0]).toMatchObject({ range_from: "2026-10-09", range_to: "2026-10-14" });
    expect(whole.json!.cancelled).toBe(6);
    expect(remaining.count).toBe(0);
    expect(audit).toEqual([
      { action: "absence", week_number: 41, reason: "Do. 08.10. – So. 11.10." },
      { action: "absence", week_number: 42, reason: "Mo. 12.10. – Mi. 14.10." },
      { action: "absence_cancel", week_number: 41, reason: "Do. 08.10." },
      { action: "absence_cancel", week_number: 41, reason: "Fr. 09.10. – So. 11.10." },
      { action: "absence_cancel", week_number: 42, reason: "Mo. 12.10. – Mi. 14.10." },
    ]);
  });
});
