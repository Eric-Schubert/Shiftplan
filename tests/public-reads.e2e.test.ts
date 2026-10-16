import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient, type ApiClient, type CookieJar } from "./helpers/api-harness";
import { apiRoutes } from "./helpers/routes";
import { webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);

const ROUTES = apiRoutes(
  "auth/login.post.ts",
  "staff/index.get.ts",
  "rotation/index.get.ts",
  "shiftplan/index.get.ts",
  "absences/index.get.ts",
  "team-access/index.post.ts",
  "viewer/login.post.ts"
);
const ABSENCES = "/api/absences?year=2026&week=42";

let client: ApiClient;

beforeEach(async () => {
  process.env.SHIFTPLAN_PUSH_RELAY_URL = "off";
  client = await createApiClient(ROUTES, (db) => {
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
      "INSERT INTO absences (staff_id, absence_date, shift_id, reason, note, source, created_by) VALUES (1, '2026-10-15', 1, 'urlaub', 'Mallorca', 'web', 'planner')"
    ).run();
  });
});

afterEach(() => {
  client.close();
  delete process.env.SHIFTPLAN_PUSH_RELAY_URL;
});

describe("reads without a planner session", () => {
  it("leave out short codes, deactivated staff and the planners' user names", async () => {
    const staff = await client.request("GET", "/api/staff");
    const rotation = await client.request("GET", "/api/rotation");
    const plan = await client.request("GET", "/api/shiftplan?year=2026&week=42");
    const absences = await client.request("GET", ABSENCES);

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

  // F087: once a team code is set, absences need it, and the code still shows no reason, note or planner name.
  it("need the team code once one is set, which shows absences without reason, note or planner name", async () => {
    const admin = await client.loginAs("admin", "admin1234");
    const created = await client.request<{ code: string }>("POST", "/api/team-access", { jar: admin, csrf: true, body: { generate: true } });
    const anonymous = await client.request("GET", ABSENCES);
    const browser: CookieJar = new Map();
    await client.request("POST", "/api/viewer/login", { jar: browser, body: { code: created.json!.code } });
    const app = await client.request<{ token: string }>("POST", "/api/viewer/login", { body: { code: created.json!.code, client: "app" } });
    const viaCookie = await client.request("GET", ABSENCES, { jar: browser });
    const viaToken = await client.request("GET", ABSENCES, { headers: { authorization: `Bearer ${app.json!.token}` } });
    const planner = await client.request("GET", ABSENCES, { jar: admin });

    expect(anonymous.status).toBe(401);
    expect(anonymous.json.data.code).toBe("errors.team.codeRequired");
    for (const response of [viaCookie, viaToken]) {
      expect(response.status).toBe(200);
      expect(response.json).toEqual([expect.objectContaining({ absence_id: 1, staff_name: "Anna Weber", shift_id: 1, source: "web" })]);
      expect(["reason", "note", "created_by"].filter((key) => key in response.json[0])).toEqual([]);
    }
    expect(planner.json[0]).toMatchObject({ reason: "urlaub", note: "Mallorca", created_by: "planner" });
  });
});
