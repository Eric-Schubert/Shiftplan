import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApiClient, type ApiClient } from "./helpers/api-harness";

let client: ApiClient;

beforeEach(async () => {
  client = await createApiClient(
    [
      ["post", "/api/auth/login", "server/api/auth/login.post"],
      ["get", "/api/staff", "server/api/staff/index.get"],
      ["get", "/api/rotation", "server/api/rotation/index.get"],
      ["get", "/api/shiftplan", "server/api/shiftplan/index.get"],
      ["get", "/api/absences", "server/api/absences/index.get"],
    ],
    (db) => {
      db.prepare("INSERT INTO staff (name, active, is_parttime, short_code) VALUES ('Anna Weber', 1, 0, 'AW'), ('Ben Alt', 0, 0, 'BA')").run();
      db.prepare("INSERT INTO shifts (name, active, start_time, end_time) VALUES ('Früh', 1, '06:00', '14:00')").run();
      db.prepare("INSERT INTO rotation_config (cycle_length, start_year, start_week) VALUES (1, 2026, 1)").run();
      db.prepare("INSERT INTO rotation_pattern (pattern_week, staff_id, shift_id) VALUES (1, 1, 1)").run();
      const { lastInsertRowid } = db.prepare("INSERT INTO weeks (year, week_number) VALUES (2026, 42)").run();
      db.prepare("INSERT INTO shift_assignments (staff_id, shift_id, week_id) VALUES (1, 1, ?)").run(lastInsertRowid);
      db.prepare(
        "INSERT INTO shift_day_changes (staff_id, shift_id, change_date, kind, created_by) VALUES (1, 1, '2026-10-14', 'remove', 'planner')"
      ).run();
      db.prepare(
        "INSERT INTO absences (staff_id, absence_date, shift_id, reason, source, created_by) VALUES (1, '2026-10-15', 1, 'urlaub', 'web', 'planner')"
      ).run();
    }
  );
});

afterEach(() => client.close());

describe("reads without a planner session", () => {
  it("leave out short codes, deactivated staff and the planners' user names", async () => {
    const staff = await client.request("GET", "/api/staff");
    const rotation = await client.request("GET", "/api/rotation");
    const plan = await client.request("GET", "/api/shiftplan?year=2026&week=42");
    const absences = await client.request("GET", "/api/absences?year=2026&week=42");

    expect(staff.json).toEqual([{ staff_id: 1, name: "Anna Weber", active: 1, is_parttime: 0 }]);
    expect(rotation.json.weeks[0].assignments[0].staff).toEqual([{ staff_id: 1, name: "Anna Weber", active: 1, is_parttime: 0 }]);
    expect(plan.json.shifts[0].assigned_staff).toEqual([{ staff_id: 1, name: "Anna Weber", active: 1, is_parttime: 0 }]);
    expect(plan.json.day_changes).toHaveLength(1);
    expect(plan.json.day_changes[0]).not.toHaveProperty("created_by");
    expect(absences.json).toHaveLength(1);
    expect(absences.json[0]).not.toHaveProperty("created_by");
    expect(JSON.stringify([staff.json, rotation.json, plan.json, absences.json])).not.toMatch(/"AW"|"planner"/);
  });

  it("keep everything for planners", async () => {
    const planner = await client.loginAs("planner", "planner1234");
    const staff = await client.request("GET", "/api/staff", { jar: planner });
    const plan = await client.request("GET", "/api/shiftplan?year=2026&week=42", { jar: planner });

    expect(staff.json.map((entry: { short_code: string }) => entry.short_code)).toEqual(["AW", "BA"]);
    expect(plan.json.shifts[0].assigned_staff[0].short_code).toBe("AW");
    expect(plan.json.day_changes[0].created_by).toBe("planner");
  });
});
