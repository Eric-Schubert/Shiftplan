import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient, type ApiClient } from "./helpers/api-harness";

let client: ApiClient;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-05T08:00:00Z") });
  client = await createApiClient(
    [
      ["post", "/api/auth/login", "server/api/auth/login.post"],
      ["get", "/api/audit", "server/api/audit/index.get"],
      ["post", "/api/shiftplan/day-change", "server/api/shiftplan/day-change.post"],
      ["post", "/api/shiftplan/generate", "server/api/shiftplan/generate.post"],
    ],
    (db) => {
      db.prepare("INSERT INTO staff (name, active, is_parttime) VALUES ('Anna Weber', 1, 0)").run();
      db.prepare(
        "INSERT INTO shifts (name, active, start_time, end_time, color, min_staff, sort_order) VALUES ('Frühschicht', 1, '06:00', '14:00', '#22c55e', 1, 1)"
      ).run();
      db.prepare("INSERT INTO rotation_config (cycle_length, start_year, start_week) VALUES (1, 2026, 41)").run();
      db.prepare("INSERT INTO rotation_pattern (pattern_week, staff_id, shift_id) VALUES (1, 1, 1)").run();
    }
  );
});

afterEach(() => {
  client.close();
  vi.useRealTimers();
});

describe("audit log", () => {
  it("lists new entries with key and values next to the German text, older ones as stored", async () => {
    client.mainDb
      .prepare(
        "INSERT INTO audit_log (user_id, username, action, year, week_number, staff_id, staff_name, reason, created_at) VALUES (1, 'planner', 'day_remove', 2026, 40, 1, 'Anna Weber', 'nur Do. 01.10.', '2026-10-01 08:00:00')"
      )
      .run();
    const planner = await client.loginAs("planner", "planner1234");
    const admin = await client.loginAs("admin", "admin1234");

    const change = await client.request("POST", "/api/shiftplan/day-change", {
      jar: planner,
      csrf: true,
      body: { staff_id: 1, shift_id: 1, date: "2026-10-08", present: true },
    });
    const audit = await client.request<{ entries: Array<Record<string, unknown>>; total: number }>("GET", "/api/audit", {
      jar: admin,
    });
    const reasons = audit.json!.entries.map(({ action, staff_name, reason, reason_key, reason_params }) => ({
      action,
      staff_name,
      reason,
      reason_key,
      reason_params,
    }));

    expect(change.status).toBe(200);
    expect(audit.json!.total).toBe(2);
    expect(reasons).toEqual([
      {
        action: "day_add",
        staff_name: "Anna Weber",
        reason: "nur Do. 08.10.",
        reason_key: "audit.reason.day",
        reason_params: { date: "2026-10-08" },
      },
      { action: "day_remove", staff_name: "Anna Weber", reason: "nur Do. 01.10.", reason_key: null, reason_params: null },
    ]);
  });

  it("names skipped and overwritten weeks of a rollout like before", async () => {
    client.mainDb.prepare("INSERT INTO weeks (year, week_number) VALUES (2026, 43)").run();
    client.mainDb.prepare("INSERT INTO shift_assignments (staff_id, shift_id, week_id) VALUES (1, 1, 1)").run();
    const planner = await client.loginAs("planner", "planner1234");
    const generate = (overwrite: boolean) =>
      client.request("POST", "/api/shiftplan/generate", {
        jar: planner,
        csrf: true,
        body: { year: 2026, week: 42, weeks: 2, overwrite },
      });

    const keep = await generate(false);
    const replace = await generate(true);
    const audit = client.mainDb.prepare("SELECT reason, reason_key FROM audit_log ORDER BY audit_id").all();

    expect([keep.status, replace.status]).toEqual([200, 200]);
    expect(audit).toEqual([
      {
        reason: "1 Woche bis KW 43/2026 aus dem Rotationsmuster erzeugt, 1 bereits geplante übersprungen",
        reason_key: "audit.reason.generatedSkipped",
      },
      {
        reason: "2 Wochen bis KW 43/2026 aus dem Rotationsmuster erzeugt, 2 davon überschrieben",
        reason_key: "audit.reason.generatedOverwritten",
      },
    ]);
  });
});
