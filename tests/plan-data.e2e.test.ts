import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient, type ApiClient, type CookieJar } from "./helpers/api-harness";

let client: ApiClient;
let admin: CookieJar;

const count = (sql: string, ...params: unknown[]) => (client.mainDb.prepare(sql).get(...params) as { count: number }).count;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-14T08:00:00Z") });
  client = await createApiClient(
    [
      ["post", "/api/auth/login", "server/api/auth/login.post"],
      ["post", "/api/shiftplan/generate", "server/api/shiftplan/generate.post"],
      ["patch", "/api/staff/:id", "server/api/staff/[id].patch"],
      ["delete", "/api/shift/:id", "server/api/shift/[id].delete"],
      ["patch", "/api/rotation/config", "server/api/rotation/config.patch"],
    ],
    (db) => {
      db.prepare("INSERT INTO staff (name, active, is_parttime) VALUES ('Anna Weber', 1, 0), ('Ben Kraus', 1, 0)").run();
      db.prepare("INSERT INTO shifts (name, active, start_time, end_time) VALUES ('Früh', 1, '06:00', '14:00'), ('Spät', 1, '14:00', '22:00')").run();
      db.prepare("INSERT INTO rotation_config (cycle_length, start_year, start_week) VALUES (3, 2026, 1)").run();
      for (const week of [1, 2, 3]) db.prepare("INSERT INTO rotation_pattern (pattern_week, staff_id, shift_id) VALUES (?, 1, 1)").run(week);
      for (const week of [42, 43]) {
        const { lastInsertRowid } = db.prepare("INSERT INTO weeks (year, week_number) VALUES (2026, ?)").run(week);
        db.prepare("INSERT INTO shift_assignments (staff_id, shift_id, week_id) VALUES (2, 2, ?)").run(lastInsertRowid);
      }
    }
  );
  admin = await client.loginAs("admin", "admin1234");
});

afterEach(() => {
  client.close();
  vi.useRealTimers();
});

describe("filling one week from the pattern", () => {
  it("runs like a one-week rollout with an audit entry", async () => {
    const response = await client.request("POST", "/api/shiftplan/generate", { jar: admin, csrf: true, body: { year: 2026, week: 42 } });

    expect(response.status).toBe(200);
    expect(response.json).toMatchObject({ generated: 1, overwritten: 1, weeks: [{ year: 2026, week: 42, status: "overwritten" }] });
    expect(client.mainDb.prepare("SELECT action, reason_key FROM audit_log").all()).toEqual([
      { action: "generate", reason_key: "audit.reason.generatedOverwritten" },
    ]);
  });

  it("refuses week 53 of a 52-week year", async () => {
    const response = await client.request("POST", "/api/shiftplan/generate", { jar: admin, csrf: true, body: { year: 2025, week: 53 } });
    expect(response.status).toBe(400);
    expect(count("SELECT COUNT(*) AS count FROM weeks WHERE year = 2025")).toBe(0);
  });
});

describe("deactivating a person", () => {
  it("clears the weeks after this one and keeps this week as history", async () => {
    client.mainDb
      .prepare(
        "INSERT INTO shift_day_changes (staff_id, shift_id, change_date, kind, created_by) VALUES (2, 1, '2026-10-16', 'add', 'admin'), (2, 1, '2026-10-20', 'add', 'admin')"
      )
      .run();

    const response = await client.request("PATCH", "/api/staff/2", { jar: admin, csrf: true, body: { active: false } });

    expect(response.status).toBe(200);
    const weeks = client.mainDb
      .prepare("SELECT w.week_number FROM shift_assignments sa JOIN weeks w ON w.week_id = sa.week_id WHERE sa.staff_id = 2")
      .all();
    expect(weeks).toEqual([{ week_number: 42 }]);
    expect(client.mainDb.prepare("SELECT change_date FROM shift_day_changes WHERE staff_id = 2").all()).toEqual([{ change_date: "2026-10-16" }]);
    expect(client.mainDb.prepare("SELECT action, staff_id, year, week_number, reason, reason_key FROM audit_log").all()).toEqual([
      {
        action: "unassign",
        staff_id: 2,
        year: 2026,
        week_number: 43,
        reason: "Deaktiviert: 1 Zuweisung ab KW 43/2026 entfernt",
        reason_key: "audit.reason.staffDeactivated",
      },
    ]);
  });
});

describe("deleting a shift", () => {
  it("drops its absences instead of turning them into whole-day absences", async () => {
    const insert = client.mainDb.prepare(
      "INSERT INTO absences (staff_id, absence_date, shift_id, reason, source, created_by) VALUES (?, '2026-10-15', ?, 'urlaub', 'web', 'admin')"
    );
    insert.run(1, 1);
    insert.run(2, 2);

    const response = await client.request("DELETE", "/api/shift/1", { jar: admin, csrf: true });

    expect(response.status).toBe(200);
    expect(client.mainDb.prepare("SELECT staff_id, shift_id FROM absences").all()).toEqual([{ staff_id: 2, shift_id: 2 }]);
  });
});

describe("shrinking the rotation cycle", () => {
  it("deletes the pattern weeks beyond it, so they come back empty", async () => {
    await client.request("PATCH", "/api/rotation/config", { jar: admin, csrf: true, body: { cycle_length: 2 } });
    await client.request("PATCH", "/api/rotation/config", { jar: admin, csrf: true, body: { cycle_length: 3 } });

    expect(client.mainDb.prepare("SELECT pattern_week FROM rotation_pattern ORDER BY pattern_week").all()).toEqual([
      { pattern_week: 1 },
      { pattern_week: 2 },
    ]);
  });
});
